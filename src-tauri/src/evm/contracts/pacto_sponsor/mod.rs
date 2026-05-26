//! `ISquadSponsorFactory` surface for Ext-path deploy and registry reads.
//! Mirrors [covenant-gov/pacto-squad-sponsor](https://github.com/covenant-gov/pacto-squad-sponsor) at a reviewed upstream revision.

use alloy::sol;

sol! {
    #[derive(Debug, PartialEq, Eq)]
    enum SquadVariant {
        NONE,
        SPONSOR,
        EXT,
    }

    interface ISquadSponsorFactory {
        struct SquadRecord {
            address sponsor;
            SquadVariant variant;
            uint256 topHatId;
        }

        function createSquadSponsorExt(bytes32 squadId) external payable returns (address sponsor);

        function createSquadSponsor(
            bytes32 squadId,
            uint256 topHatId,
            address registry,
            uint256[] calldata customEligibleHats
        ) external payable returns (address sponsor);

        function PAYMASTER() external view returns (address paymaster);

        function squads(bytes32 squadId) external view returns (SquadRecord memory record);

        event SquadCreated(
            bytes32 indexed squadId,
            address sponsor,
            SquadVariant variant,
            address indexed addressOwner
        );
    }
}
