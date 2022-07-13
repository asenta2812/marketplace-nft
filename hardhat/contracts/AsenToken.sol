// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract AsenToken is ERC20, Pausable, AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    mapping(address => bool) private _blackList;

    event BlackListAdded(address _account);
    event BlackListRemoved(address _account);

    constructor(uint256 initialSupply) ERC20("Asen", "ASE") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);
        _mint(msg.sender, initialSupply * 10**decimals());
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        require(
            _blackList[from] == false,
            "Asen: Account sender was in blacklist"
        );
        require(
            _blackList[to] == false,
            "Asen: Account recipient was in blacklist"
        );
        super._beforeTokenTransfer(from, to, amount);
    }

    function addToBlackList(address _account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            _account != msg.sender,
            "Asen: Must not add Admin to blacklist"
        );
        require(
            _blackList[_account] == false,
            "Asen: Account was on blacklist"
        );

        _blackList[_account] = true;
        emit BlackListAdded(_account);
    }

    function removeFromBlackList(address _account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            _blackList[_account] == false,
            "Asen: Account was not on blacklist"
        );

        _blackList[_account] = false;
        emit BlackListRemoved(_account);
    }
}
