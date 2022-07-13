import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { Petty } from "../../typechain";

describe("NFT Petty Test", function () {
  let accountA: SignerWithAddress,
    accountB: SignerWithAddress,
    accountC: SignerWithAddress;
  let petty: Petty;
  const address0 = "0x0000000000000000000000000000000000000000";
  const uri = "sampleuri.com/";

  beforeEach(async () => {
    [accountA, accountB, accountC] = await ethers.getSigners();
    const Petty = await ethers.getContractFactory("Petty");
    petty = await Petty.deploy();
    await petty.deployed();
  });

  describe("mint", () => {
    it("Should revert if mint to zero address", async () => {
      await expect(petty.mint(address0)).to.be.revertedWith(
        "ERC721: mint to the zero address"
      );
    });

    it("Should revert if mint by another account", async () => {
      await expect(petty.connect(accountB.address).mint(accountB.address)).to.be
        .reverted;
    });

    it("Shoud mint token correctly", async () => {
      const mintTx = await petty.mint(accountA.address);
      await expect(mintTx)
        .to.be.emit(petty, "Transfer")
        .withArgs(address0, accountA.address, 1);

      expect(await petty.balanceOf(accountA.address)).to.be.equal(1);
      expect(await petty.ownerOf(1)).to.be.equal(accountA.address);

      // mint 2
      const mintTx2 = await petty.mint(accountA.address);
      await expect(mintTx2)
        .to.be.emit(petty, "Transfer")
        .withArgs(address0, accountA.address, 2);
      expect(await petty.balanceOf(accountA.address)).to.be.equal(2);
      expect(await petty.ownerOf(2)).to.be.equal(accountA.address);
    });
  });
  describe("updateBaseTokenURI", () => {
    it("Shoud updateBaseTokenURI correctly", async () => {
      await petty.mint(accountC.address);
      await petty.updateBaseTokenURI(uri);
      expect(await petty.tokenURI(1)).to.be.equal(`${uri}1`);
    });
  });
});
