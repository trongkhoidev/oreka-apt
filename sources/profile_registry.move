module yugo::profile_registry {

    use std::vector;
    use std::table::{Self, Table};
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;

    /// Error constants
    const ENOT_INITIALIZED: u64 = 1001;
    const EINVALID_PROFILE_HASH: u64 = 1002;
    const EINVALID_PROFILE_CID: u64 = 1003;

    /// Profile registry events
    struct ProfileEvents has key {
        updates: EventHandle<ProfileUpdated>,
    }

    /// Profile updated event
    struct ProfileUpdated has drop, store, copy {
        user: address,
        profile_hash: vector<u8>,   // sha256 của JSON chuẩn hóa
        profile_cid: vector<u8>,    // ví dụ "ipfs://<cid>" (ASCII)
        timestamp: u64,
    }

    /// Profile data structure
    struct Profile has copy, drop, store {
        username: vector<u8>,
        avatar_url: vector<u8>,
        bio: vector<u8>,
        profile_hash: vector<u8>,
        profile_cid: vector<u8>,
        updated_at: u64,
    }

    /// User profiles mapping
    struct UserProfiles has key {
        profiles: Table<address, Profile>,
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    /// Initialize profile registry
    public entry fun init(owner: &signer) {
        let _owner_addr = std::signer::address_of(owner);
        
        // Initialize profile events
        move_to(owner, ProfileEvents { 
            updates: account::new_event_handle<ProfileUpdated>(owner) 
        });
        
        // Initialize user profiles table
        move_to(owner, UserProfiles { 
            profiles: table::new<address, Profile>() 
        });
    }

    // ============================================================================
    // PROFILE MANAGEMENT
    // ============================================================================

    /// Update user profile (called by backend after verification)
    public entry fun update_profile(
        user: address,
        username: vector<u8>,
        avatar_url: vector<u8>,
        bio: vector<u8>,
        profile_hash: vector<u8>,
        profile_cid: vector<u8>
    ) acquires ProfileEvents, UserProfiles {
        // Validate inputs
        assert!(vector::length(&profile_hash) == 64, EINVALID_PROFILE_HASH); // 64 hex characters = 32 bytes
        assert!(vector::length(&profile_cid) > 0, EINVALID_PROFILE_CID);
        
        let profiles = &mut borrow_global_mut<UserProfiles>(@yugo).profiles;
        
        // Use a default timestamp for now - in production this will be set by the blockchain
        let current_time = 0;
        
        // Create or update profile
        let profile = Profile {
            username,
            avatar_url,
            bio,
            profile_hash,
            profile_cid,
            updated_at: current_time,
        };
        
        if (table::contains<address, Profile>(profiles, user)) {
            let _ = table::remove<address, Profile>(profiles, user);
            table::add<address, Profile>(profiles, user, profile);
        } else {
            table::add<address, Profile>(profiles, user, profile);
        };
        
        // Emit profile updated event
        let events = &mut borrow_global_mut<ProfileEvents>(@yugo).updates;
        event::emit_event<ProfileUpdated>(events, ProfileUpdated {
            user,
            profile_hash,
            profile_cid,
            timestamp: current_time,
        });
    }

    /// Get user profile
    public fun get_profile(user: address): Profile acquires UserProfiles {
        let profiles = &borrow_global<UserProfiles>(@yugo).profiles;
        assert!(table::contains<address, Profile>(profiles, user), ENOT_INITIALIZED);
        *table::borrow<address, Profile>(profiles, user)
    }

    /// Check if user profile exists
    public fun profile_exists(user: address): bool acquires UserProfiles {
        let profiles = &borrow_global<UserProfiles>(@yugo).profiles;
        table::contains<address, Profile>(profiles, user)
    }

    /// Get profile hash for verification
    public fun get_profile_hash(user: address): vector<u8> acquires UserProfiles {
        let profile = get_profile(user);
        profile.profile_hash
    }

    /// Get profile CID for IPFS lookup
    public fun get_profile_cid(user: address): vector<u8> acquires UserProfiles {
        let profile = get_profile(user);
        profile.profile_cid
    }

    /// Get username
    public fun get_username(user: address): vector<u8> acquires UserProfiles {
        let profile = get_profile(user);
        profile.username
    }

    /// Get avatar URL
    public fun get_avatar_url(user: address): vector<u8> acquires UserProfiles {
        let profile = get_profile(user);
        profile.avatar_url
    }

    /// Get bio
    public fun get_bio(user: address): vector<u8> acquires UserProfiles {
        let profile = get_profile(user);
        profile.bio
    }

    /// Get profile update timestamp
    public fun get_profile_updated_at(user: address): u64 acquires UserProfiles {
        let profile = get_profile(user);
        profile.updated_at
    }

    // ============================================================================
    // ADMIN FUNCTIONS
    // ============================================================================

    /// Remove user profile (admin only)
    public entry fun remove_profile(_admin: &signer, user: address) acquires UserProfiles {
        // TODO: Add admin check
        let profiles = &mut borrow_global_mut<UserProfiles>(@yugo).profiles;
        if (table::contains<address, Profile>(profiles, user)) {
            table::remove<address, Profile>(profiles, user);
        };
    }


}
