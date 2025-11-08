import React, { createContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import MedicalWallet from '../artifacts/contracts/MedicalWallet.sol/MedicalWallet.json';

export const BlockchainContext = createContext();

const CONTRACT_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

export const BlockchainProvider = ({ children }) => {
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const connectWallet = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const accounts = await provider.send('eth_requestAccounts', []);
        setAccount(accounts[0]);
        const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, MedicalWallet.abi, signer);
        setContract(contractInstance);
      }
    };
    connectWallet();
  }, []);

  return (
    <BlockchainContext.Provider value={{ contract, account }}>
      {children}
    </BlockchainContext.Provider>
  );
};
