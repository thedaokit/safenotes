import React from 'react';
import Image from 'next/image';
import { type Chain } from '@/db/schema';

const chainIconMap: Record<Chain, string> = {
  ETH: '/chain-icons/eth.svg',
  ARB: '/chain-icons/arbitrum.svg',
  UNI: '/chain-icons/uniswap.svg',
  BASE: '/chain-icons/base-chain.svg',
  LINEA: '/chain-icons/linea.svg',
  OP: '/chain-icons/op-chain.svg',
  SCROLL: '/chain-icons/scroll-chain.svg',
};

interface ChainIconProps {
  chain: Chain;
  className?: string;
  width?: number;
  height?: number;
}

export const ChainIcon: React.FC<ChainIconProps> = ({
  chain,
  className,
  width = 24,
  height = 24,
}) => {
    console.log(chain)
  const iconPath = chainIconMap[chain];

  console.log(iconPath)
  return (
    <Image
      src={iconPath}
      alt={`${chain} chain icon`}
      className={className}
      width={width}
      height={height}
      priority
    />
  );
};
