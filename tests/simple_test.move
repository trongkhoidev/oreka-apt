#[test_only]
module yugo::simple_test {
    use std::signer;
    use aptos_framework::account;

    #[test]
    fun test_basic() {
        let account = account::create_account_for_test(@0x123);
        assert!(signer::address_of(&account) == @0x123, 0);
    }
}
