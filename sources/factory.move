module yugo::factory {
    use std::signer;
    use std::string::String;
    use std::table::{Self, Table};
    use std::vector;
    use aptos_framework::event::Self;
    use yugo::binary_option_market;
    use aptos_framework::object;

    /// Thông tin chi tiết về contract để frontend truy xuất
    struct MarketInfo has store, copy, drop {
        market_address: address,
        owner: address,
        pair_name: String,
        strike_price: u64,
        fee_percentage: u64,
        bidding_start_time: u64,
        bidding_end_time: u64,
        maturity_time: u64,
    }

    /// A global factory for creating and tracking binary option markets.
    /// The factory itself is a resource stored at the module publisher's account address.
    struct Factory has key {
        /// A table mapping an owner's address to a vector of market objects they've created.
        owner_contracts: Table<address, vector<address>>,
        contracts_info: Table<address, MarketInfo>,
        all_market_addresses: vector<address>,
    }

    /// Event emitted when a new market is successfully deployed.
    #[event]
    struct DeployedEvent has drop, store {
        owner: address,
        market_address: address,
        index: u64,
        pair_name: String,
        strike_price: u64,
        fee_percentage: u64,
        bidding_start_time: u64,
        bidding_end_time: u64,
        maturity_time: u64,
    }

    /// Event emitted when the factory is successfully initialized.
    #[event]
    struct FactoryInitializedEvent has drop, store {
        owner: address,
    }

    /// The module owner must call this function once to initialize the factory.
    public entry fun initialize(account: &signer) {
        move_to(account, Factory {
            owner_contracts: table::new(),
            contracts_info: table::new(),
            all_market_addresses: vector::empty<address>(),
        });
        event::emit(FactoryInitializedEvent {
            owner: signer::address_of(account),
        });
    }

    /// Deploys a new binary option market contract and emits an event.
    public entry fun deploy_market(
        creator: &signer,
        pair_name: String,
        strike_price: u64,
        fee_percentage: u64,
        bidding_start_time: u64,
        bidding_end_time: u64,
        maturity_time: u64
    ) acquires Factory {
        let creator_address = signer::address_of(creator);
        let factory = borrow_global_mut<Factory>(@yugo);
        assert!(bidding_end_time < maturity_time, 1001); // Custom error code
        let market_object = yugo::binary_option_market::initialize(
            creator,
            pair_name,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time,
            bidding_start_time // created_at giả lập bằng bidding_start_time
        );
        let market_address = object::object_address(&market_object);
        // Lưu vào owner_contracts
        if (table::contains(&factory.owner_contracts, creator_address)) {
            let contracts = table::borrow_mut(&mut factory.owner_contracts, creator_address);
            vector::push_back(contracts, market_address);
        } else {
            let new_contracts_vec = vector::empty<address>();
            vector::push_back(&mut new_contracts_vec, market_address);
            table::add(&mut factory.owner_contracts, creator_address, new_contracts_vec);
        };
        // Lưu vào contracts_info
        let info = MarketInfo {
            market_address,
            owner: creator_address,
            pair_name,
            strike_price,
            fee_percentage,
            bidding_start_time,
            bidding_end_time,
            maturity_time,
        };
        table::add(&mut factory.contracts_info, market_address, info);
        // Lưu vào all_market_addresses
        vector::push_back(&mut factory.all_market_addresses, market_address);
        // Emit event
        event::emit(DeployedEvent {
            owner: creator_address,
            market_address,
            index: 0, // index không còn dùng
            pair_name,
            strike_price: info.strike_price,
            fee_percentage: info.fee_percentage,
            bidding_start_time: info.bidding_start_time,
            bidding_end_time: info.bidding_end_time,
            maturity_time: info.maturity_time,
        });
    }

    /// Trả về danh sách MarketInfo của owner
    #[view]
    public fun get_contracts_by_owner(owner: address): vector<MarketInfo> acquires Factory {
        let factory = borrow_global<Factory>(@yugo);
        if (table::contains(&factory.owner_contracts, owner)) {
            let addresses = table::borrow(&factory.owner_contracts, owner);
            let  infos = vector::empty<MarketInfo>();
            let len = vector::length(addresses);
            let  i = 0;
            while (i < len) {
                let addr = *vector::borrow(addresses, i);
                if (table::contains(&factory.contracts_info, addr)) {
                    let info = table::borrow(&factory.contracts_info, addr);
                    vector::push_back(&mut infos, *info);
                };
                i = i + 1;
            };
            infos
        } else {
            vector::empty<MarketInfo>()
        }
    }

    /// Retrieves the number of market contracts deployed by a specific owner.
    public fun get_owner_contract_count(owner: address): u64 acquires Factory {
        let factory = borrow_global<Factory>(@yugo);
        if (table::contains(&factory.owner_contracts, owner)) {
            vector::length(table::borrow(&factory.owner_contracts, owner))
        } else {
            0
        }
    }

    /// Trả về danh sách tất cả MarketInfo của mọi market
    #[view]
    public fun get_all_markets(): vector<MarketInfo> acquires Factory {
        let factory = borrow_global<Factory>(@yugo);
        let infos = vector::empty<MarketInfo>();
        let addresses = &factory.all_market_addresses;
        let len = vector::length(addresses);
        let i = 0;
        while (i < len) {
            let addr = *vector::borrow(addresses, i);
            if (table::contains(&factory.contracts_info, addr)) {
                let info = table::borrow(&factory.contracts_info, addr);
                vector::push_back(&mut infos, *info);
            };
            i = i + 1;
        };
        infos
    }

    // public fun get_all_contracts(): vector<Object<Market>> acquires Factory {
    //     // Not supported: Table does not have keys() in Move. If needed, store keys separately.
    //     vector::empty<Object<Market>>()
    // }
}
