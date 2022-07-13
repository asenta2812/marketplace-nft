// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract Marketplace is Ownable {
    using Counters for Counters.Counter;
    using EnumerableSet for EnumerableSet.AddressSet;

    struct Order {
        address seller;
        address buyer;
        uint256 tokenID;
        address paymentToken;
        uint256 price;
    }

    Counters.Counter private _orderIDCount;

    // immutable: readonly and only initial by contructor
    IERC721 public immutable nftContract;

    mapping(uint256 => Order) private _orders;

    // fee
    uint256 public feeDecimal;
    uint256 public feeRate;
    // address of recipient fee
    address public feeRecipient;

    EnumerableSet.AddressSet private _supportedPaymentTokens;

    // event
    // index: filter event
    event OrderAdded(
        uint256 indexed orderId,
        address indexed seller,
        uint256 indexed tokenID,
        address paymentToken,
        uint256 price
    );

    event OrderCancelled(uint256 orderId);

    event OrderMatched(
        uint256 indexed orderId,
        address indexed seller,
        address indexed buyer,
        uint256 tokenID,
        address paymentToken,
        uint256 price
    );

    event FeeRateUpdated(uint256 feeDecimal, uint256 feeRate);

    constructor(
        address nftAddress_,
        uint256 feeDecimal_,
        uint256 feeRate_,
        address feeRecipient_
    ) {
        require(
            nftAddress_ != address(0),
            "NFTMarketplace: nftAddress_ is zero address"
        );
        _updateFeeRecipient(feeRecipient_);
        _updateFeeRate(feeDecimal_, feeRate_);

        nftContract = IERC721(nftAddress_);
        _orderIDCount.increment();
    }

    function _updateFeeRecipient(address feeRecipient_) internal {
        require(
            feeRecipient_ != address(0),
            "NFTMarketplace: feeRecipent_ is zero address"
        );
        feeRecipient = feeRecipient_;
    }

    function updateFeeRecipient(address feeRecipient_) external onlyOwner {
        _updateFeeRecipient(feeRecipient_);
    }

    function _updateFeeRate(uint256 feeDecimal_, uint256 feeRate_) internal {
        require(
            feeRate_ < 10**(feeDecimal_ + 2),
            "NFTMarketplace: bad fee rate"
        );

        feeDecimal = feeDecimal_;
        feeRate = feeRate_;
    }

    function updateFeeRate(uint256 feeDecimal_, uint256 feeRate_)
        external
        onlyOwner
    {
        _updateFeeRate(feeDecimal_, feeRate_);
    }

    function _calculateFee(uint256 orderID_) private view returns (uint256) {
        // khi tao instance tu 1 struct => `storage` keyword
        Order storage _order = _orders[orderID_];
        if (feeRate == 0) {
            return 0;
        }

        return (feeRate * _order.price) / 10**(feeDecimal + 2);
    }

    function isSeller(uint256 orderID_, address seller_)
        public
        view
        returns (bool)
    {
        return _orders[orderID_].seller == seller_;
    }

    function addPaymentToken(address paymentToken_) external onlyOwner {
        require(
            paymentToken_ != address(0),
            "NFTMarketPlace: paymentToken_ is zero address"
        );
        require(
            _supportedPaymentTokens.add(paymentToken_),
            "NFTMarketPlace: already supported"
        );
    }

    function isPaymentTokenSupported(address paymentToken_)
        public
        view
        returns (bool)
    {
        return _supportedPaymentTokens.contains(paymentToken_);
    }

    modifier onlySupportPaymentToken(address paymentToken_) {
        require(
            isPaymentTokenSupported(paymentToken_),
            "NFTMarketplace: unsupport payment token"
        );
        _;
    }

    modifier whenTokenHasNotBeenSold(uint256 orderID_) {
        require(
            _orders[orderID_].buyer == address(0),
            "NFTMarketplace: token have been sold"
        );
        _;
    }

    function addOrder(
        uint256 tokenID_,
        address paymentToken_,
        uint256 price_
    ) public onlySupportPaymentToken(paymentToken_) {
        require(
            nftContract.ownerOf(tokenID_) == _msgSender(),
            "NFTMarketplace: sender is not owner of token"
        );
        require(
            nftContract.getApproved(tokenID_) == address(this) ||
                nftContract.isApprovedForAll(_msgSender(), address(this)),
            "NFTMarketplace: The contract is unauthorized to manage this token"
        );

        require(price_ != 0, "NFTMarketplace: price must be greater than 0");

        // 1. set to mapping _orders
        uint256 _orderId = _orderIDCount.current();
        _orders[_orderId] = Order(
            _msgSender(),
            address(0),
            tokenID_,
            paymentToken_,
            price_
        );

        // 2. send nft to marketplace (address(this))
        nftContract.transferFrom(_msgSender(), address(this), tokenID_);

        // 3. Emit event
        emit OrderAdded(
            _orderId,
            _msgSender(),
            tokenID_,
            paymentToken_,
            price_
        );

        // 4. Increment orderIDCount
        _orderIDCount.increment();
    }

    function cancelOrder(uint256 orderID_)
        external
        whenTokenHasNotBeenSold(orderID_)
    {
        Order storage _order = _orders[orderID_];

        require(
            _order.seller == _msgSender(),
            "NFTMarketplace: must be owner of token"
        );
        uint256 _tokenID = _order.tokenID;
        delete _orders[orderID_];
        nftContract.transferFrom(address(this), _msgSender(), _tokenID);

        emit OrderCancelled(orderID_);
    }

    function executeOrder(uint256 orderID_)
        external
        whenTokenHasNotBeenSold(orderID_)
    {
        // buyer != seller
        require(
            !isSeller(orderID_, _msgSender()),
            "NFTMarketplace: buyer must be different seller"
        );
        Order storage _order = _orders[orderID_];
        require(_order.price > 0, "NFTMarketplace: order not found");

        // 1. update buyer
        _order.buyer = _msgSender();

        // 2. Transfer fee to feeRecipient address
        uint256 _feeAmount = _calculateFee(orderID_);

        if (_feeAmount > 0) {
            IERC20(_order.paymentToken).transferFrom(
                _msgSender(),
                feeRecipient,
                _feeAmount
            );
        }

        // 3. Transfer token ERC20 from buyer to seller
        IERC20(_order.paymentToken).transferFrom(
            _msgSender(),
            _order.seller,
            _order.price - _feeAmount
        );

        // 4. Transfer NFT marketplace to buyer
        nftContract.transferFrom(address(this), _msgSender(), _order.tokenID);

        // 5. Emit Order event
        emit OrderMatched(
            orderID_,
            _order.seller,
            _msgSender(),
            _order.tokenID,
            _order.paymentToken,
            _order.price
        );
    }
}
