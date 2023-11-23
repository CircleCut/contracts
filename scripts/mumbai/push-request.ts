import { ethers } from "hardhat";
import "dotenv/config";

async function main() {
  const PriceConversionContract = await ethers.getContractFactory(
    "PriceConversionContract"
  );

  const [deployer] = await ethers.getSigners();

  const consumerSC = process.env["MUMBAI_CONSUMER_CONTRACT_ADDRESS"] || "";
  const consumer = PriceConversionContract.attach(consumerSC);
  await Promise.all([consumer.deployed()]);

  console.log("Pushing a request...");
  await consumer
    .connect(deployer)
    .request(
      [1, 2, 3, 4, 5, 0, 0, 0, 0, 0],
      [
        500000000000000, 5000000000, 54545, 325000000000, 1100000000000, 0, 0,
        0, 0, 0,
      ]
    );
  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
