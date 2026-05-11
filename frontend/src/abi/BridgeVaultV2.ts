export const bridgeVaultV2Abi = [
  // Functions
  {
    type: 'function',
    name: 'lock',
    inputs: [
      { name: '_recipient', type: 'address', internalType: 'address' },
      { name: '_destChainId', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'unlock',
    inputs: [
      { name: '_recipient', type: 'address', internalType: 'address' },
      { name: '_amount', type: 'uint256', internalType: 'uint256' },
      { name: '_burnTxHash', type: 'bytes32', internalType: 'bytes32' },
      { name: '_sourceNonce', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'feePercent',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'minLockAmount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'availableBalance',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nonce',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'accumulatedFees',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'relayer',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'paused',
    inputs: [],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isProcessed',
    inputs: [
      { name: '_burnTxHash', type: 'bytes32', internalType: 'bytes32' },
      { name: '_sourceNonce', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'supportedChains',
    inputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSupportedChains',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[]', internalType: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'addChain',
    inputs: [{ name: '_chainId', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'removeChain',
    inputs: [{ name: '_chainId', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setRelayer',
    inputs: [{ name: '_relayer', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setFeePercent',
    inputs: [{ name: '_feePercent', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setMinLockAmount',
    inputs: [{ name: '_minLockAmount', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdrawFees',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'pause',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'unpause',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'Locked',
    inputs: [
      { name: 'sender', type: 'address', indexed: true, internalType: 'address' },
      { name: 'recipient', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'fee', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'nonce', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'destChainId', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'Unlocked',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'processId', type: 'bytes32', indexed: true, internalType: 'bytes32' },
    ],
  },
  {
    type: 'event',
    name: 'ChainAdded',
    inputs: [
      { name: 'chainId', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'ChainRemoved',
    inputs: [
      { name: 'chainId', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'RelayerUpdated',
    inputs: [
      { name: 'oldRelayer', type: 'address', indexed: true, internalType: 'address' },
      { name: 'newRelayer', type: 'address', indexed: true, internalType: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'FeePercentUpdated',
    inputs: [
      { name: 'oldFee', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'newFee', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'FeesWithdrawn',
    inputs: [
      { name: 'to', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'MinLockAmountUpdated',
    inputs: [
      { name: 'oldAmount', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'newAmount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
  },
  // Receive
  {
    type: 'receive',
    stateMutability: 'payable',
  },
] as const
