module yugo::ork_access_control {
    use std::signer;
    use std::vector;
    use std::table::{Self, Table};
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_framework::timestamp;

    // ============================================================================
    // CONSTANTS
    // ============================================================================
    
    // Error codes
    const EACCESS_DENIED: u64 = 1001;
    const EUSER_NOT_FOUND: u64 = 1004;
    const EINVALID_ROLE: u64 = 1005;
    const EINVALID_OPERATION: u64 = 9003;
    
    // Role constants
    const ROLE_OWNER: u8 = 1;
    const ROLE_GOVERNOR: u8 = 2;
    const ROLE_PAUSER: u8 = 3;
    const ROLE_MINTER: u8 = 4;
    const ROLE_ALLOCATOR: u8 = 5;
    const ROLE_OPERATOR: u8 = 6;
    
    // Permission constants
    const PERMISSION_PAUSE: u8 = 1;
    const PERMISSION_MINT: u8 = 2;
    const PERMISSION_BURN: u8 = 3;
    const PERMISSION_MANAGE_ROLES: u8 = 4;
    const PERMISSION_MANAGE_BUDGET: u8 = 5;
    const PERMISSION_MANAGE_TREASURY: u8 = 6;
    const PERMISSION_MANAGE_VESTING: u8 = 7;
    const PERMISSION_MANAGE_AIRDROP: u8 = 8;
    const PERMISSION_EMERGENCY: u8 = 9;
    const PERMISSION_RESOLVE_MARKET: u8 = 10; // Permission to resolve markets
    const PERMISSION_WITHDRAW_FEE: u8 = 11;   // Permission to withdraw fees
    const PERMISSION_WITHDRAW_RAKE: u8 = 12;  // Permission to withdraw rake

    // ============================================================================
    // EVENT STRUCTURES
    // ============================================================================
    
    /// Role granted event
    struct RoleGrantedEvent has drop, store {
        user: address,
        role: u8,
        granted_by: address,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// Role revoked event
    struct RoleRevokedEvent has drop, store {
        user: address,
        role: u8,
        revoked_by: address,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// Permission granted event
    struct PermissionGrantedEvent has drop, store {
        user: address,
        permission: u8,
        granted_by: address,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// Permission revoked event
    struct PermissionRevokedEvent has drop, store {
        user: address,
        permission: u8,
        revoked_by: address,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// System paused event
    struct SystemPausedEvent has drop, store {
        pauser: address,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// System resumed event
    struct SystemResumedEvent has drop, store {
        resumer: address,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// Emergency activated event
    struct EmergencyActivatedEvent has drop, store {
        pauser: address,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// Emergency deactivated event
    struct EmergencyDeactivatedEvent has drop, store {
        resumer: address,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }

    // ============================================================================
    // ACCESS CONTROL STRUCTURES
    // ============================================================================
    
    /// Access control manager for ORK token
    struct ORKAccessControl has key {
        /// Owner address (can transfer ownership to Governor)
        owner: address,
        /// Governor address (DAO or multisig)
        governor: address,
        /// Whether system is paused
        is_paused: bool,
        /// Whether emergency mode is active
        emergency_mode: bool,
        /// Role assignments
        user_roles: Table<address, vector<u8>>,
        /// Role permissions
        role_permissions: Table<u8, vector<u8>>,
        /// Pending role transfers
        pending_transfers: Table<address, RoleTransfer>,
        /// Event handles
        role_granted_events: EventHandle<RoleGrantedEvent>,
        role_revoked_events: EventHandle<RoleRevokedEvent>,
        permission_granted_events: EventHandle<PermissionGrantedEvent>,
        permission_revoked_events: EventHandle<PermissionRevokedEvent>,
        system_paused_events: EventHandle<SystemPausedEvent>,
        system_resumed_events: EventHandle<SystemResumedEvent>,
        emergency_activated_events: EventHandle<EmergencyActivatedEvent>,
        emergency_deactivated_events: EventHandle<EmergencyDeactivatedEvent>,
        role_transfer_proposed_events: EventHandle<RoleTransferProposedEvent>,
        role_transfer_accepted_events: EventHandle<RoleTransferAcceptedEvent>,
        role_transfer_cancelled_events: EventHandle<RoleTransferCancelledEvent>,
    }
    
    /// Role transfer request
    struct RoleTransfer has store, copy, drop {
        from: address,
        to: address,
        role: u8,
        proposed_at: u64,
        expires_at: u64,
    }
    
    /// Role transfer proposed event
    struct RoleTransferProposedEvent has drop, store {
        from: address,
        to: address,
        role: u8,
        proposed_at: u64,
        expires_at: u64,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// Role transfer accepted event
    struct RoleTransferAcceptedEvent has drop, store {
        from: address,
        to: address,
        role: u8,
        accepted_at: u64,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }
    
    /// Role transfer cancelled event
    struct RoleTransferCancelledEvent has drop, store {
        from: address,
        to: address,
        role: u8,
        cancelled_at: u64,
        timestamp: u64,
        block_height: u64,
        transaction_hash: vector<u8>,
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    
    /// Initialize ORK access control
    public entry fun initialize_ork_access_control(admin: &signer) acquires ORKAccessControl {
        let admin_addr = signer::address_of(admin);
        
        let access_control = ORKAccessControl {
            owner: admin_addr,
            governor: admin_addr, // Initially admin is governor
            is_paused: false,
            emergency_mode: false,
            user_roles: table::new(),
            role_permissions: table::new(),
            pending_transfers: table::new(),
            role_granted_events: account::new_event_handle<RoleGrantedEvent>(admin),
            role_revoked_events: account::new_event_handle<RoleRevokedEvent>(admin),
            permission_granted_events: account::new_event_handle<PermissionGrantedEvent>(admin),
            permission_revoked_events: account::new_event_handle<PermissionRevokedEvent>(admin),
            system_paused_events: account::new_event_handle<SystemPausedEvent>(admin),
            system_resumed_events: account::new_event_handle<SystemResumedEvent>(admin),
            emergency_activated_events: account::new_event_handle<EmergencyActivatedEvent>(admin),
            emergency_deactivated_events: account::new_event_handle<EmergencyDeactivatedEvent>(admin),
            role_transfer_proposed_events: account::new_event_handle<RoleTransferProposedEvent>(admin),
            role_transfer_accepted_events: account::new_event_handle<RoleTransferAcceptedEvent>(admin),
            role_transfer_cancelled_events: account::new_event_handle<RoleTransferCancelledEvent>(admin),
        };
        
        move_to(admin, access_control);
        
        // Grant owner role to admin
        grant_role(admin, admin_addr, ROLE_OWNER);
        
        // Setup default permissions
        setup_default_permissions(admin, admin_addr);
    }

    /// Setup default role permissions
    fun setup_default_permissions(_admin: &signer, _admin_addr: address) acquires ORKAccessControl {
        let access_control = borrow_global_mut<ORKAccessControl>(@yugo);
        
        // Owner permissions (all permissions)
        let owner_permissions = vector[
            PERMISSION_PAUSE, PERMISSION_MINT, PERMISSION_BURN, PERMISSION_MANAGE_ROLES,
            PERMISSION_MANAGE_BUDGET, PERMISSION_MANAGE_TREASURY, PERMISSION_MANAGE_VESTING,
            PERMISSION_MANAGE_AIRDROP, PERMISSION_EMERGENCY, PERMISSION_RESOLVE_MARKET,
            PERMISSION_WITHDRAW_FEE, PERMISSION_WITHDRAW_RAKE
        ];
        table::add(&mut access_control.role_permissions, ROLE_OWNER, owner_permissions);
        
        // Governor permissions (most permissions except owner transfer)
        let governor_permissions = vector[
            PERMISSION_PAUSE, PERMISSION_MINT, PERMISSION_BURN, PERMISSION_MANAGE_ROLES,
            PERMISSION_MANAGE_BUDGET, PERMISSION_MANAGE_TREASURY, PERMISSION_MANAGE_VESTING,
            PERMISSION_RESOLVE_MARKET, PERMISSION_WITHDRAW_FEE, PERMISSION_WITHDRAW_RAKE
        ];
        table::add(&mut access_control.role_permissions, ROLE_GOVERNOR, governor_permissions);
        
        // Pauser permissions
        let pauser_permissions = vector[PERMISSION_PAUSE];
        table::add(&mut access_control.role_permissions, ROLE_PAUSER, pauser_permissions);
        
        // Minter permissions
        let minter_permissions = vector[PERMISSION_MINT];
        table::add(&mut access_control.role_permissions, ROLE_MINTER, minter_permissions);
        
        // Allocator permissions
        let allocator_permissions = vector[
            PERMISSION_MANAGE_BUDGET, PERMISSION_MANAGE_TREASURY, PERMISSION_MANAGE_VESTING
        ];
        table::add(&mut access_control.role_permissions, ROLE_ALLOCATOR, allocator_permissions);
        
        // Operator permissions
        let operator_permissions = vector[
            PERMISSION_MANAGE_VESTING, PERMISSION_MANAGE_AIRDROP
        ];
        table::add(&mut access_control.role_permissions, ROLE_OPERATOR, operator_permissions);
    }

    // ============================================================================
    // ROLE MANAGEMENT
    // ============================================================================
    
    /// Grant role to user
    public entry fun grant_role(
        admin: &signer,
        user: address,
        role: u8
    ) acquires ORKAccessControl {
        let admin_addr = signer::address_of(admin);
        
        // Check if admin has role management permission
        require_permission(admin_addr, PERMISSION_MANAGE_ROLES);
        
        let access_control = borrow_global_mut<ORKAccessControl>(@yugo);
        
        // Validate role
        assert!(role >= ROLE_OWNER && role <= ROLE_OPERATOR, EINVALID_ROLE);
        
        // Check if user exists
        assert!(table::contains(&access_control.user_roles, user), EUSER_NOT_FOUND);
        
        // Grant role to user
        let user_roles = table::borrow_mut(&mut access_control.user_roles, user);
        vector::push_back(user_roles, role);
        
        // Emit event
        event::emit_event(
            &mut access_control.role_granted_events,
            RoleGrantedEvent {
                user,
                role,
                granted_by: admin_addr,
                timestamp: timestamp::now_seconds(),
                block_height: 0, // TODO: Get from context
                transaction_hash: vector::empty(),
            }
        );
    }
    
    /// Revoke role from user
    public entry fun revoke_role(
        admin: &signer,
        user: address,
        role: u8
    ) acquires ORKAccessControl {
        let admin_addr = signer::address_of(admin);
        
        // Check if admin has role management permission
        require_permission(admin_addr, PERMISSION_MANAGE_ROLES);
        
        let access_control = borrow_global_mut<ORKAccessControl>(@yugo);
        
        // Validate role
        assert!(role >= ROLE_OWNER && role <= ROLE_OPERATOR, EINVALID_ROLE);
        
        // Check if user exists
        assert!(table::contains(&access_control.user_roles, user), EUSER_NOT_FOUND);
        
        // Remove role from user
        let user_roles = table::borrow_mut(&mut access_control.user_roles, user);
        let i = 0;
        let len = vector::length(user_roles);
        while (i < len) {
            if (*vector::borrow(user_roles, i) == role) {
                vector::remove(user_roles, i);
                break
            };
            i = i + 1;
        };
        
        // Emit event
        event::emit_event(
            &mut access_control.role_revoked_events,
            RoleRevokedEvent {
                user,
                role,
                revoked_by: admin_addr,
                timestamp: timestamp::now_seconds(),
                block_height: 0, // TODO: Get from context
                transaction_hash: vector::empty(),
            }
        );
    }
    
    /// Propose role transfer
    public entry fun propose_role_transfer(
        from: &signer,
        to: address,
        role: u8
    ) acquires ORKAccessControl {
        let from_addr = signer::address_of(from);
        
        // Check if caller has the role
        assert!(has_role(from_addr, role), EACCESS_DENIED);
        
        // Validate role
        assert!(role >= ROLE_OWNER && role <= ROLE_OPERATOR, EINVALID_ROLE);
        
        // Validate recipient
        assert!(to != @0x0, EUSER_NOT_FOUND);
        
        let access_control = borrow_global_mut<ORKAccessControl>(@yugo);
        
        // Create transfer request
        let transfer = RoleTransfer {
            from: from_addr,
            to,
            role,
            proposed_at: timestamp::now_seconds(),
            expires_at: timestamp::now_seconds() + 86400, // 24 hours
        };
        
        table::add(&mut access_control.pending_transfers, from_addr, transfer);
        
        // Emit event
        event::emit_event(
            &mut access_control.role_transfer_proposed_events,
            RoleTransferProposedEvent {
                from: from_addr,
                to,
                role,
                proposed_at: transfer.proposed_at,
                expires_at: transfer.expires_at,
                timestamp: timestamp::now_seconds(),
                block_height: 0, // TODO: Get from context
                transaction_hash: vector::empty(),
            }
        );
    }
    
    /// Accept role transfer
    public entry fun accept_role_transfer(
        to: &signer,
        from: address
    ) acquires ORKAccessControl {
        let to_addr = signer::address_of(to);
        let access_control = borrow_global_mut<ORKAccessControl>(@yugo);
        
        // Check if transfer exists
        assert!(table::contains(&access_control.pending_transfers, from), EUSER_NOT_FOUND);
        
        let transfer = table::borrow(&access_control.pending_transfers, from);
        
        // Check if recipient matches
        assert!(transfer.to == to_addr, EACCESS_DENIED);
        
        // Check if transfer hasn't expired
        assert!(timestamp::now_seconds() <= transfer.expires_at, EINVALID_OPERATION);
        
        // Copy role before removing transfer
        let transfer_role = transfer.role;
        
        // Handle role transfer based on role type
        if (transfer_role == ROLE_OWNER) {
            // Owner transfer requires special handling
            access_control.owner = to_addr;
        } else if (transfer_role == ROLE_GOVERNOR) {
            // Governor transfer
            access_control.governor = to_addr;
        };
        
        // Remove pending transfer
        table::remove(&mut access_control.pending_transfers, from);
        
        // Emit event
        event::emit_event(
            &mut access_control.role_transfer_accepted_events,
            RoleTransferAcceptedEvent {
                from,
                to: to_addr,
                role: transfer_role,
                accepted_at: timestamp::now_seconds(),
                timestamp: timestamp::now_seconds(),
                block_height: 0, // TODO: Get from context
                transaction_hash: vector::empty(),
            }
        );
    }
    
    /// Cancel role transfer
    public entry fun cancel_role_transfer(
        from: &signer
    ) acquires ORKAccessControl {
        let from_addr = signer::address_of(from);
        let access_control = borrow_global_mut<ORKAccessControl>(@yugo);
        
        // Check if transfer exists
        assert!(table::contains(&access_control.pending_transfers, from_addr), EUSER_NOT_FOUND);
        
        // Remove pending transfer
        table::remove(&mut access_control.pending_transfers, from_addr);
        
        // Emit event
        event::emit_event(
            &mut access_control.role_transfer_cancelled_events,
            RoleTransferCancelledEvent {
                from: from_addr,
                to: @0x0, // Not applicable for cancellation
                role: 0, // Not applicable for cancellation
                cancelled_at: timestamp::now_seconds(),
                timestamp: timestamp::now_seconds(),
                block_height: 0, // TODO: Get from context
                transaction_hash: vector::empty(),
            }
        );
    }

    // ============================================================================
    // PERMISSION CHECKS
    // ============================================================================
    
    /// Check if user has role
    public fun has_role(user: address, role: u8): bool acquires ORKAccessControl {
        let access_control = borrow_global<ORKAccessControl>(@yugo);
        
        if (!table::contains(&access_control.user_roles, user)) {
            return false
        };
        
        let user_roles = table::borrow(&access_control.user_roles, user);
        let i = 0;
        let len = vector::length(user_roles);
        while (i < len) {
            if (*vector::borrow(user_roles, i) == role) {
                return true
            };
            i = i + 1;
        };
        false
    }
    
    /// Check if user has permission
    public fun has_permission(user: address, permission: u8): bool acquires ORKAccessControl {
        let access_control = borrow_global<ORKAccessControl>(@yugo);
        
        // Check if user has any role
        if (!table::contains(&access_control.user_roles, user)) {
            return false
        };
        
        // Check if any of user's roles have the permission
        let user_roles = table::borrow(&access_control.user_roles, user);
        let i = 0;
        let len = vector::length(user_roles);
        while (i < len) {
            let role = *vector::borrow(user_roles, i);
            if (table::contains(&access_control.role_permissions, role)) {
                let role_permissions = table::borrow(&access_control.role_permissions, role);
                let j = 0;
                let perm_len = vector::length(role_permissions);
                while (j < perm_len) {
                    if (*vector::borrow(role_permissions, j) == permission) {
                        return true
                    };
                    j = j + 1;
                };
            };
            i = i + 1;
        };
        false
    }
    
    /// Require role (aborts if user doesn't have role)
    public fun require_role(user: address, role: u8) acquires ORKAccessControl {
        assert!(has_role(user, role), EACCESS_DENIED);
    }
    
    /// Require permission (aborts if user doesn't have permission)
    public fun require_permission(user: address, permission: u8) acquires ORKAccessControl {
        assert!(has_permission(user, permission), EACCESS_DENIED);
    }

    // ============================================================================
    // SYSTEM CONTROL
    // ============================================================================
    
    /// Check if system is paused
    public fun is_paused(): bool acquires ORKAccessControl {
        let access_control = borrow_global<ORKAccessControl>(@yugo);
        access_control.is_paused
    }
    
    /// Check if emergency mode is active
    public fun is_emergency_mode(): bool acquires ORKAccessControl {
        let access_control = borrow_global<ORKAccessControl>(@yugo);
        access_control.emergency_mode
    }
    
    /// Pause system
    public entry fun pause_system(
        admin: &signer
    ) acquires ORKAccessControl {
        let admin_addr = signer::address_of(admin);
        
        // Check if caller has pause permission
        require_permission(admin_addr, PERMISSION_PAUSE);
        
        let access_control = borrow_global_mut<ORKAccessControl>(@yugo);
        access_control.is_paused = true;
        
        // Emit event
        event::emit_event(
            &mut access_control.system_paused_events,
            SystemPausedEvent {
                pauser: admin_addr,
                timestamp: timestamp::now_seconds(),
                block_height: 0, // TODO: Get from context
                transaction_hash: vector::empty(),
            }
        );
    }
    
    /// Resume system
    public entry fun resume_system(
        admin: &signer
    ) acquires ORKAccessControl {
        let admin_addr = signer::address_of(admin);
        
        // Check if caller has pause permission
        require_permission(admin_addr, PERMISSION_PAUSE);
        
        let access_control = borrow_global_mut<ORKAccessControl>(@yugo);
        access_control.is_paused = false;
        
        // Emit event
        event::emit_event(
            &mut access_control.system_resumed_events,
            SystemResumedEvent {
                resumer: admin_addr,
                timestamp: timestamp::now_seconds(),
                block_height: 0, // TODO: Get from context
                transaction_hash: vector::empty(),
            }
        );
    }
    
    /// Activate emergency mode
    public entry fun activate_emergency_mode(
        admin: &signer
    ) acquires ORKAccessControl {
        let admin_addr = signer::address_of(admin);
        
        // Check if caller has emergency permission
        require_permission(admin_addr, PERMISSION_EMERGENCY);
        
        let access_control = borrow_global_mut<ORKAccessControl>(@yugo);
        access_control.emergency_mode = true;
        
        // Emit event
        event::emit_event(
            &mut access_control.emergency_activated_events,
            EmergencyActivatedEvent {
                pauser: admin_addr,
                timestamp: timestamp::now_seconds(),
                block_height: 0, // TODO: Get from context
                transaction_hash: vector::empty(),
            }
        );
    }
    
    /// Deactivate emergency mode
    public entry fun deactivate_emergency_mode(
        admin: &signer
    ) acquires ORKAccessControl {
        let admin_addr = signer::address_of(admin);
        
        // Check if caller has emergency permission
        require_permission(admin_addr, PERMISSION_EMERGENCY);
        
        let access_control = borrow_global_mut<ORKAccessControl>(@yugo);
        access_control.emergency_mode = false;
        
        // Emit event
        event::emit_event(
            &mut access_control.emergency_deactivated_events,
            EmergencyDeactivatedEvent {
                resumer: admin_addr,
                timestamp: timestamp::now_seconds(),
                block_height: 0, // TODO: Get from context
                transaction_hash: vector::empty(),
            }
        );
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================
    
    /// Get user roles
    public fun get_user_roles(user: address): vector<u8> acquires ORKAccessControl {
        let access_control = borrow_global<ORKAccessControl>(@yugo);
        
        if (table::contains(&access_control.user_roles, user)) {
            *table::borrow(&access_control.user_roles, user)
        } else {
            vector<u8>[]
        }
    }
    
    /// Get role permissions
    public fun get_role_permissions(role: u8): vector<u8> acquires ORKAccessControl {
        let access_control = borrow_global<ORKAccessControl>(@yugo);
        
        if (table::contains(&access_control.role_permissions, role)) {
            *table::borrow(&access_control.role_permissions, role)
        } else {
            vector<u8>[]
        }
    }
    
    /// Get access control info
    public fun get_access_control_info(): (address, address, bool, bool) acquires ORKAccessControl {
        let access_control = borrow_global<ORKAccessControl>(@yugo);
        (
            access_control.owner,
            access_control.governor,
            access_control.is_paused,
            access_control.emergency_mode
        )
    }
    
    /// Get pending transfers
    public fun get_pending_transfers(): vector<address> acquires ORKAccessControl {
        let _access_control = borrow_global<ORKAccessControl>(@yugo);
        // TODO: Implement proper table iteration
        vector::empty()
    }

    /// Get pending transfer details
    public fun get_pending_transfer(from: address): RoleTransfer acquires ORKAccessControl {
        let _access_control = borrow_global<ORKAccessControl>(@yugo);
        assert!(table::contains(&_access_control.pending_transfers, from), EUSER_NOT_FOUND);
        *table::borrow(&_access_control.pending_transfers, from)
    }

    // ============================================================================
    // PERMISSION GETTER FUNCTIONS
    // ============================================================================
    
    /// Get resolve market permission constant
    public fun get_permission_resolve_market(): u8 {
        PERMISSION_RESOLVE_MARKET
    }
    
    /// Get withdraw fee permission constant
    public fun get_permission_withdraw_fee(): u8 {
        PERMISSION_WITHDRAW_FEE
    }
    
    /// Get withdraw rake permission constant
    public fun get_permission_withdraw_rake(): u8 {
        PERMISSION_WITHDRAW_RAKE
    }
    
    /// Get pause permission constant
    public fun get_permission_pause(): u8 {
        PERMISSION_PAUSE
    }
    
    /// Get mint permission constant
    public fun get_permission_mint(): u8 {
        PERMISSION_MINT
    }
    
    /// Get burn permission constant
    public fun get_permission_burn(): u8 {
        PERMISSION_BURN
    }
    
    /// Get manage roles permission constant
    public fun get_permission_manage_roles(): u8 {
        PERMISSION_MANAGE_ROLES
    }
    
    /// Get manage budget permission constant
    public fun get_permission_manage_budget(): u8 {
        PERMISSION_MANAGE_BUDGET
    }
    
    /// Get manage treasury permission constant
    public fun get_permission_manage_treasury(): u8 {
        PERMISSION_MANAGE_TREASURY
    }
    
    /// Get manage vesting permission constant
    public fun get_permission_manage_vesting(): u8 {
        PERMISSION_MANAGE_VESTING
    }
    
    /// Get manage airdrop permission constant
    public fun get_permission_manage_airdrop(): u8 {
        PERMISSION_MANAGE_AIRDROP
    }
    
    /// Get emergency permission constant
    public fun get_permission_emergency(): u8 {
        PERMISSION_EMERGENCY
    }
}
