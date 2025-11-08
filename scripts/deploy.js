const hre = require("hardhat");

async function main() {
  const MedicalWallet = await hre.ethers.getContractFactory("MedicalWallet");
  const medicalWallet = await MedicalWallet.deploy();
  await medicalWallet.waitForDeployment();

  console.log("Contract deployed to:", await medicalWallet.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
