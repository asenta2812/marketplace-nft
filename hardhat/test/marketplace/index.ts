import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { Marketplace, Petty, AsenToken } from "../../typechain";

describe("MarketPlace Test", function () {
  let [
    admin,
    seller,
    buyer,
    feeRecipient,
    samplePaymentToken,
  ]: SignerWithAddress[] = [];
  let petty: Petty;
  let ase: AsenToken;
  let marketplace: Marketplace;
  const defaultFeeRate = 10;
  const defaultFeeDecimal = 0;
  const defaultPrice = ethers.utils.parseEther("100");
  const defaultBalance = ethers.utils.parseEther("10000");
  const defaultSupply = 1000000;
  const address0 = "0x0000000000000000000000000000000000000000";
  const calculateFee = ({
    price = defaultPrice,
    decimal = defaultFeeDecimal,
    rate = defaultFeeRate,
  } = {}): BigNumber => {
    return price.mul(rate).div(10 ** (decimal + 2));
  };
  beforeEach(async () => {
    [admin, seller, buyer, feeRecipient, samplePaymentToken] =
      await ethers.getSigners();
    const Petty = await ethers.getContractFactory("Petty");
    petty = await Petty.deploy();
    await petty.deployed();
    const AsenToken = await ethers.getContractFactory("AsenToken");
    ase = await AsenToken.deploy(defaultSupply);
    await ase.deployed();
    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy(
      petty.address,
      defaultFeeDecimal,
      defaultFeeRate,
      feeRecipient.address
    );
    await marketplace.deployed();
    await marketplace.addPaymentToken(ase.address);
    await ase.transfer(seller.address, defaultBalance);
    await ase.transfer(buyer.address, defaultBalance);
  });
  describe("common", function () {
    it("feeDecimal should return correct value", async function () {
      expect(await marketplace.feeDecimal()).to.be.equal(defaultFeeDecimal);
    });
    it("feeRate should return correct value", async function () {
      expect(await marketplace.feeRate()).to.be.equal(defaultFeeRate);
    });
    it("feeRecipient should return correct value", async function () {
      expect(await marketplace.feeRecipient()).to.be.equal(
        feeRecipient.address
      );
    });
  });
  describe("updateFeeRecipient", function () {
    it("should revert if feeRecipient is address 0", async function () {
      await expect(marketplace.updateFeeRecipient(address0)).to.be.revertedWith(
        "NFTMarketplace: feeRecipent_ is zero address"
      );
    });
    it("should revert if sender isn't contract owner", async function () {
      await expect(
        marketplace.connect(seller).updateFeeRecipient(buyer.address)
      ).to.be.reverted;
    });
    it("should update correctly", async function () {
      await marketplace.updateFeeRecipient(buyer.address);
      expect(await marketplace.feeRecipient()).to.be.equal(buyer.address);
    });
  });

  describe("updateFeeRate", function () {
    it("should revert if fee rate >= 10^(feeDecimal+2)", async function () {
      const updateTx = marketplace.updateFeeRate(0, 100);
      await expect(updateTx).to.be.revertedWith("NFTMarketplace: bad fee rate");
    });
    it("should revert if sender isn't contract owner", async function () {
      const updateTx = marketplace.connect(seller).updateFeeRate(0, 10);
      await expect(updateTx).to.be.reverted;
    });
    it("should update correctly", async function () {
      await marketplace.updateFeeRate(1, 5);
      it("feeDecimal should return correct value", async function () {
        expect(await marketplace.feeDecimal()).to.be.equal(0);
      });
      it("feeRate should return correct value", async function () {
        expect(await marketplace.feeRate()).to.be.equal(5);
      });
    });
  });
  describe("addPaymentToken", function () {
    it("should revert paymentToken is Address 0", async function () {
      const addPaymentTokenTx = marketplace.addPaymentToken(address0);
      await expect(addPaymentTokenTx).to.be.revertedWith(
        "NFTMarketPlace: paymentToken_ is zero address"
      );
    });
    it("should revert if address is already supported", async function () {
      const addPaymentTokenTx = marketplace.addPaymentToken(ase.address);
      await expect(addPaymentTokenTx).to.be.revertedWith(
        "NFTMarketPlace: already supported"
      );
    });
    it("should revert if sender is not contract owner", async function () {
      const addPaymentTokenTx = marketplace
        .connect(seller)
        .addPaymentToken(ase.address);
      await expect(addPaymentTokenTx).to.be.reverted;
    });
    it("should add payment token correctly", async function () {
      await marketplace.addPaymentToken(samplePaymentToken.address);

      expect(
        await marketplace.isPaymentTokenSupported(samplePaymentToken.address)
      ).to.be.equal(true);
    });
  });
  // important
  describe("addOrder", function () {
    beforeEach(async () => {
      await petty.mint(seller.address);
    });
    it("should revert if payment token not supported", async function () {
      await petty.connect(seller).setApprovalForAll(marketplace.address, true);
      const tx = marketplace
        .connect(seller)
        .addOrder(1, samplePaymentToken.address, defaultPrice);
      await expect(tx).to.be.revertedWith(
        "NFTMarketplace: unsupport payment token"
      );
    });
    it("should revert if sender isn't nft owner", async function () {
      await petty.connect(seller).setApprovalForAll(marketplace.address, true);
      const tx = marketplace
        .connect(buyer)
        .addOrder(1, ase.address, defaultPrice);
      await expect(tx).to.be.revertedWith(
        "NFTMarketplace: sender is not owner of token"
      );
    });
    it("should revert if nft hasn't been approve for marketplace contract", async function () {
      const tx = marketplace
        .connect(seller)
        .addOrder(1, ase.address, defaultPrice);
      await expect(tx).to.be.revertedWith(
        "NFTMarketplace: The contract is unauthorized to manage this token"
      );
    });
    it("should revert if price = 0", async function () {
      await petty.connect(seller).setApprovalForAll(marketplace.address, true);
      const tx = marketplace.connect(seller).addOrder(1, ase.address, 0);
      await expect(tx).to.be.revertedWith(
        "NFTMarketplace: price must be greater than 0"
      );
    });
    it("should add order correctly", async function () {
      await petty.connect(seller).setApprovalForAll(marketplace.address, true);
      const tx = marketplace
        .connect(seller)
        .addOrder(1, ase.address, defaultPrice);

      // check emit event
      await expect(tx)
        .to.be.emit(marketplace, "OrderAdded")
        .withArgs(1, seller.address, 1, ase.address, defaultPrice);

      // check nft owner is marketplace address
      expect(await petty.ownerOf(1)).to.be.equal(marketplace.address);

      // mint 2
      await petty.mint(seller.address);
      // check emit event
      await expect(
        marketplace.connect(seller).addOrder(2, ase.address, defaultPrice)
      )
        .to.be.emit(marketplace, "OrderAdded")
        .withArgs(2, seller.address, 2, ase.address, defaultPrice);

      // check nft owner is marketplace address
      expect(await petty.ownerOf(2)).to.be.equal(marketplace.address);
    });
  });
  describe("cancelOrder", function () {
    beforeEach(async () => {
      await petty.mint(seller.address);
      await petty.connect(seller).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(seller).addOrder(1, ase.address, defaultPrice);
    });
    it("should revert if order has been sold", async function () {
      await ase.connect(buyer).approve(marketplace.address, defaultPrice);
      await marketplace.connect(buyer).executeOrder(1);
      await expect(marketplace.cancelOrder(1)).to.be.revertedWith(
        "NFTMarketplace: token have been sold"
      );
    });
    it("should revert if sender isn't order owner", async function () {
      await expect(
        marketplace.connect(buyer).cancelOrder(1)
      ).to.be.revertedWith("NFTMarketplace: must be owner of token");
    });
    it("should cancel correctly", async function () {
      // check owner of petty is marketplace
      expect(await petty.ownerOf(1)).to.be.equal(marketplace.address);

      const tx = marketplace.connect(seller).cancelOrder(1);
      await expect(tx).to.be.emit(marketplace, "OrderCancelled").withArgs(1);

      expect(await petty.ownerOf(1)).to.be.equal(seller.address);
    });
  });
  describe("executeOrder", function () {
    beforeEach(async () => {
      await petty.mint(seller.address);
      await petty.connect(seller).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(seller).addOrder(1, ase.address, defaultPrice);
      await ase.connect(buyer).approve(marketplace.address, defaultPrice);
    });
    it("should revert if buyer is seller", async function () {
      const tx = marketplace.connect(seller).executeOrder(1);
      await expect(tx).to.be.revertedWith(
        "NFTMarketplace: buyer must be different seller"
      );
    });
    it("should revert if order has been sold", async function () {
      await marketplace.connect(buyer).executeOrder(1);
      const tx = marketplace.connect(buyer).executeOrder(1);
      await expect(tx).to.be.revertedWith(
        "NFTMarketplace: token have been sold"
      );
    });
    it("should revert if order has been cancel or not found", async function () {
      await marketplace.connect(seller).cancelOrder(1);
      const tx = marketplace.connect(buyer).executeOrder(1);
      await expect(tx).to.be.revertedWith("NFTMarketplace: order not found");
    });
    it("should execute order correctly with default fee", async function () {
      await marketplace.connect(buyer).executeOrder(1);
      // check buyer have a nft?
      expect(await petty.ownerOf(1)).to.be.equal(buyer.address);

      // check amount of buyer
      expect(await ase.balanceOf(buyer.address)).to.be.equal(
        defaultBalance.sub(defaultPrice)
      );

      // check amount of seller
      const fee = calculateFee();
      expect(await ase.balanceOf(seller.address)).to.be.equal(
        defaultBalance.add(defaultPrice.sub(fee))
      );

      // check amount of marketplace
      expect(await ase.balanceOf(feeRecipient.address)).to.be.equal(fee);
    });
    it("should execute order correctly with 0 fee", async function () {
      await marketplace.connect(admin).updateFeeRate(0, 0);
      await marketplace.connect(buyer).executeOrder(1);
      // check buyer have a nft?
      expect(await petty.ownerOf(1)).to.be.equal(buyer.address);

      // check amount of buyer
      expect(await ase.balanceOf(buyer.address)).to.be.equal(
        defaultBalance.sub(defaultPrice)
      );

      // check amount of seller
      expect(await ase.balanceOf(seller.address)).to.be.equal(
        defaultBalance.add(defaultPrice)
      );

      // check amount of marketplace
      expect(await ase.balanceOf(feeRecipient.address)).to.be.equal(0);
    });
    it("should execute order correctly with fee 1 = 99%", async function () {
      await marketplace.connect(admin).updateFeeRate(0, 99);
      await marketplace.connect(buyer).executeOrder(1);
      // check buyer have a nft?
      expect(await petty.ownerOf(1)).to.be.equal(buyer.address);

      // check amount of buyer
      expect(await ase.balanceOf(buyer.address)).to.be.equal(
        defaultBalance.sub(defaultPrice)
      );

      // check amount of seller
      const fee = calculateFee({ rate: 99 });

      expect(await ase.balanceOf(seller.address)).to.be.equal(
        defaultBalance.add(defaultPrice.sub(fee))
      );

      // check amount of marketplace
      expect(await ase.balanceOf(feeRecipient.address)).to.be.equal(fee);
    });
    it("should execute order correctly with fee 2 = 10.11111%", async function () {
      await marketplace.connect(admin).updateFeeRate(5, 1011111);
      await marketplace.connect(buyer).executeOrder(1);
      // check buyer have a nft?
      expect(await petty.ownerOf(1)).to.be.equal(buyer.address);

      // check amount of buyer
      expect(await ase.balanceOf(buyer.address)).to.be.equal(
        defaultBalance.sub(defaultPrice)
      );

      // check amount of seller
      const fee = calculateFee({ rate: 1011111, decimal: 5 });

      expect(await ase.balanceOf(seller.address)).to.be.equal(
        defaultBalance.add(defaultPrice.sub(fee))
      );

      // check amount of marketplace
      expect(await ase.balanceOf(feeRecipient.address)).to.be.equal(fee);
    });
  });
});
