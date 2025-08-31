#[test_only]
module yugo::profile_registry_tests {
    use aptos_framework::account;
    use yugo::profile_registry;
    
    const TEST_ADDRESS: address = @0x123;
    const TEST_USER: address = @0x456;
    const YUGO_ADDRESS: address = @yugo;
    
    #[test]
    fun test_profile_registry_initialization() {
        let admin = account::create_account_for_test(YUGO_ADDRESS);
        
        // Initialize profile registry
        profile_registry::init(&admin);
        
        // Verify initialization - should not exist yet since no profile was created
        assert!(!profile_registry::profile_exists(TEST_ADDRESS), 0);
    }
    
    #[test]
    fun test_profile_update() {
        let admin = account::create_account_for_test(YUGO_ADDRESS);
        let _user = account::create_account_for_test(TEST_USER);
        
        // Initialize profile registry
        profile_registry::init(&admin);
        
        // Update profile
        let username = b"test_user";
        let avatar_url = b"https://example.com/avatar.jpg";
        let bio = b"Test bio";
        let profile_hash = b"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        let profile_cid = b"ipfs://QmTest1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        
        profile_registry::update_profile(
            TEST_USER,
            username,
            avatar_url,
            bio,
            profile_hash,
            profile_cid
        );
        
        // Verify profile was created
        assert!(profile_registry::profile_exists(TEST_USER), 0);
        
        // Verify profile data using getter functions
        assert!(profile_registry::get_username(TEST_USER) == username, 1);
        assert!(profile_registry::get_avatar_url(TEST_USER) == avatar_url, 2);
        assert!(profile_registry::get_bio(TEST_USER) == bio, 3);
        assert!(profile_registry::get_profile_hash(TEST_USER) == profile_hash, 4);
        assert!(profile_registry::get_profile_cid(TEST_USER) == profile_cid, 5);
    }
    
    #[test]
    fun test_profile_update_existing() {
        let admin = account::create_account_for_test(YUGO_ADDRESS);
        let _user = account::create_account_for_test(TEST_USER);
        
        // Initialize profile registry
        profile_registry::init(&admin);
        
        // Create initial profile
        let username1 = b"user1";
        let avatar_url1 = b"https://example.com/avatar1.jpg";
        let bio1 = b"First bio";
        let profile_hash1 = b"1111111111111111111111111111111111111111111111111111111111111111";
        let profile_cid1 = b"ipfs://QmFirst1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        
        profile_registry::update_profile(
            TEST_USER,
            username1,
            avatar_url1,
            bio1,
            profile_hash1,
            profile_cid1
        );
        
        // Update profile
        let username2 = b"user2";
        let avatar_url2 = b"https://example.com/avatar2.jpg";
        let bio2 = b"Second bio";
        let profile_hash2 = b"2222222222222222222222222222222222222222222222222222222222222222";
        let profile_cid2 = b"ipfs://QmSecond1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        
        profile_registry::update_profile(
            TEST_USER,
            username2,
            avatar_url2,
            bio2,
            profile_hash2,
            profile_cid2
        );
        
        // Verify updated profile data using getter functions
        assert!(profile_registry::get_username(TEST_USER) == username2, 1);
        assert!(profile_registry::get_avatar_url(TEST_USER) == avatar_url2, 2);
        assert!(profile_registry::get_bio(TEST_USER) == bio2, 3);
        assert!(profile_registry::get_profile_hash(TEST_USER) == profile_hash2, 4);
        assert!(profile_registry::get_profile_cid(TEST_USER) == profile_cid2, 5);
    }
    
    #[test]
    fun test_profile_getters() {
        let admin = account::create_account_for_test(YUGO_ADDRESS);
        let _user = account::create_account_for_test(TEST_USER);
        
        // Initialize profile registry
        profile_registry::init(&admin);
        
        // Create profile
        let username = b"test_user";
        let avatar_url = b"https://example.com/avatar.jpg";
        let bio = b"Test bio";
        let profile_hash = b"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        let profile_cid = b"ipfs://QmTest1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        
        profile_registry::update_profile(
            TEST_USER,
            username,
            avatar_url,
            bio,
            profile_hash,
            profile_cid
        );
        
        // Test getters
        assert!(profile_registry::get_username(TEST_USER) == username, 1);
        assert!(profile_registry::get_avatar_url(TEST_USER) == avatar_url, 2);
        assert!(profile_registry::get_bio(TEST_USER) == bio, 3);
        assert!(profile_registry::get_profile_hash(TEST_USER) == profile_hash, 4);
        assert!(profile_registry::get_profile_cid(TEST_USER) == profile_cid, 5);
    }
    
    #[test]
    fun test_profile_remove() {
        let admin = account::create_account_for_test(YUGO_ADDRESS);
        let _user = account::create_account_for_test(TEST_USER);
        
        // Initialize profile registry
        profile_registry::init(&admin);
        
        // Create profile
        let username = b"test_user";
        let avatar_url = b"https://example.com/avatar.jpg";
        let bio = b"Test bio";
        let profile_hash = b"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        let profile_cid = b"ipfs://QmTest1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        
        profile_registry::update_profile(
            TEST_USER,
            username,
            avatar_url,
            bio,
            profile_hash,
            profile_cid
        );
        
        // Verify profile exists
        assert!(profile_registry::profile_exists(TEST_USER), 0);
        
        // Remove profile
        profile_registry::remove_profile(&admin, TEST_USER);
        
        // Verify profile was removed
        assert!(!profile_registry::profile_exists(TEST_USER), 1);
    }
}
