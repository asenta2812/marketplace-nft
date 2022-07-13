// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Reserve is Ownable {
    IERC20 public immutable token;
    uint256 public unlockTime;

    constructor(address _tokenAddress) {
        token = IERC20(_tokenAddress);
        unlockTime = block.timestamp + 24 weeks;
    }

    modifier checkTimestamp() {
        require(block.timestamp > unlockTime, "Reverse: Can not trade");
        _;
    }

    function withdrawTo(address _to, uint256 _value)
        public
        onlyOwner
        checkTimestamp
    {
        require(_to != address(0), "Reverse: _to is not a valid address");
        require(
            token.balanceOf(address(this)) >= _value,
            "Reverse: exceeds contract balance"
        );
        token.transfer(_to, _value);
    }
}
