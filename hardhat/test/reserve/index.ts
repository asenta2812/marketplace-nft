import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { Reserve, AsenToken, Marketplace, Petty } from "../../typechain";

describe("Reserve Test", function () {
  let [admin, receiver, seller, buyer]: SignerWithAddress[] = [];
  let ase: AsenToken;
  let reserve: Reserve;
  const address0 = "0x0000000000000000000000000000000000000000";
  const defaultSupply = 1000000;
  const defaultBalance = ethers.utils.parseEther("1000");
  const defaultAmountTransfer = ethers.utils.parseEther("100");
  const oneWeek = 86400 * 7;
  beforeEach(async () => {
    [admin, receiver, seller, buyer] = await ethers.getSigners();
    const AsenToken = await ethers.getContractFactory("AsenToken");
    ase = await AsenToken.deploy(defaultSupply);
    await ase.deployed();
    const Reserve = await ethers.getContractFactory("Reserve");
    reserve = await Reserve.deploy(ase.address);
    await reserve.deployed();
  });

  describe("withDrawTo", () => {
    beforeEach(async () => {
      await ase.transfer(reserve.address, defaultBalance);
    });
    it("Should revert if not owner", async () => {
      await expect(
        reserve
          .connect(receiver)
          .withdrawTo(seller.address, defaultAmountTransfer)
      ).to.be.reverted;
    });

    it("Should revert if not exceed unlock time", async () => {
      await expect(
        reserve.withdrawTo(seller.address, defaultAmountTransfer)
      ).to.be.revertedWith("Reverse: Can not trade");
    });

    it("Shoud revert if to is address 0", async () => {
      await network.provider.send("evm_increaseTime", [oneWeek * 24]);
      await expect(
        reserve.withdrawTo(address0, defaultAmountTransfer)
      ).to.be.revertedWith("Reverse: _to is not a valid address");
    });

    it("Shoud revert if exceed contract balance", async () => {
      await network.provider.send("evm_increaseTime", [oneWeek * 24]);
      await expect(
        reserve.withdrawTo(receiver.address, defaultBalance.add(1))
      ).to.be.revertedWith("Reverse: exceeds contract balance");
    });

    it("Should withdraw correctly", async () => {
      await network.provider.send("evm_increaseTime", [oneWeek * 24]);
      await reserve.withdrawTo(receiver.address, defaultAmountTransfer);
      expect(await ase.balanceOf(reserve.address)).to.be.equal(
        defaultBalance.sub(defaultAmountTransfer)
      );

      expect(await ase.balanceOf(receiver.address)).to.be.equal(
        defaultAmountTransfer
      );
    });
  });

  describe("Combined with contract marketplace", function () {
    it("should withdraw correctly with fee from marketplace", async function () {
      const defaultFeeDecimal = 0;
      const defaultFeeRate = 10;
      const defaultPrice = ethers.utils.parseEther("100");
      const Petty = await ethers.getContractFactory("Petty");
      const petty: Petty = await Petty.deploy();
      await petty.deployed();
      const Marketplace = await ethers.getContractFactory("Marketplace");
      const marketplace: Marketplace = await Marketplace.deploy(
        petty.address,
        defaultFeeDecimal,
        defaultFeeRate,
        reserve.address
      );
      await marketplace.deployed();
      await marketplace.addPaymentToken(ase.address);
      await ase.transfer(seller.address, defaultBalance);
      await ase.transfer(buyer.address, defaultBalance);

      await petty.mint(seller.address);
      await petty.connect(seller).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(seller).addOrder(1, ase.address, defaultPrice);
      await ase.connect(buyer).approve(marketplace.address, defaultPrice);
      await marketplace.connect(buyer).executeOrder(1);
      const feeTransfer = defaultPrice.mul(10).div(100);
      await network.provider.send("evm_increaseTime", [oneWeek * 24]);

      expect(await ase.balanceOf(reserve.address)).to.be.equal(feeTransfer);
      await reserve.connect(admin).withdrawTo(receiver.address, feeTransfer);
      expect(await ase.balanceOf(receiver.address)).to.be.equal(feeTransfer);
      expect(await ase.balanceOf(reserve.address)).to.be.equal(0);
    });
  });
});
