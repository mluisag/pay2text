import { useEvmAddress } from "@coinbase/cdp-hooks";
import {
  SendEvmTransactionButton,
  type SendEvmTransactionButtonProps,
} from "@coinbase/cdp-react/components/SendEvmTransactionButton";
import { Button } from "@coinbase/cdp-react/components/ui/Button";
import { LoadingSkeleton } from "@coinbase/cdp-react/components/ui/LoadingSkeleton";
import { useMemo, useState } from "react";

interface Props {
  balance?: string;
  onSuccess?: () => void;
}

/**
 * This component demonstrates how to send an EVM transaction using EOA (Externally Owned Accounts).
 *
 * @param {Props} props - The props for the EOATransaction component.
 * @param {string} [props.balance] - The user's balance.
 * @param {() => void} [props.onSuccess] - A function to call when the transaction is successful.
 * @returns A component that displays a transaction form and a transaction hash.
 */
function EOATransaction(props: Props) {
  const { balance, onSuccess } = props;
  const { evmAddress } = useEvmAddress();
  const [transactionHash, setTransactionHash] = useState("");
  const [error, setError] = useState("");

  const hasBalance = useMemo(() => {
    return balance && balance !== "0";
  }, [balance]);

  const transaction = useMemo<SendEvmTransactionButtonProps["transaction"]>(() => {
    return {
      to: evmAddress, // Send to yourself for testing
      value: 1000000000000n,
      gas: 21000n,
      chainId: 42431, // Tempo testnet (boilerplate test tx — Phase 4 will delete this component)
      type: "eip1559",
    };
  }, [evmAddress]);

  const handleTransactionError: SendEvmTransactionButtonProps["onError"] = error => {
    setTransactionHash("");
    setError(error.message);
  };

  const handleTransactionSuccess: SendEvmTransactionButtonProps["onSuccess"] = hash => {
    setTransactionHash(hash);
    setError("");
    onSuccess?.();
  };

  const handleReset = () => {
    setTransactionHash("");
    setError("");
  };

  return (
    <>
      {balance === undefined && (
        <>
          <h2 className="card-title">Send a transaction</h2>
          <LoadingSkeleton className="loading--text" />
          <LoadingSkeleton className="loading--btn" />
        </>
      )}
      {balance !== undefined && (
        <>
          {!transactionHash && error && (
            <>
              <h2 className="card-title">Oops</h2>
              <p>{error}</p>
              <Button className="tx-button" onClick={handleReset} variant="secondary">
                Reset and try again
              </Button>
            </>
          )}
          {!transactionHash && !error && (
            <>
              <h2 className="card-title">Send a transaction</h2>
              {hasBalance && evmAddress && (
                <>
                  <p>Send a tiny test transaction to yourself on Tempo testnet</p>
                  <SendEvmTransactionButton
                    account={evmAddress}
                    network="base-sepolia"
                    transaction={transaction}
                    onError={handleTransactionError}
                    onSuccess={handleTransactionSuccess}
                  />
                </>
              )}
              {!hasBalance && (
                <>
                  <p>
                    This example transaction sends a tiny amount of ETH from your wallet to itself.
                  </p>
                  <p>
                    Get some from{" "}
                    <a
                      href="https://wallet.tempo.xyz"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Tempo testnet faucet
                    </a>
                  </p>
                </>
              )}
            </>
          )}
          {transactionHash && (
            <>
              <h2 className="card-title">Transaction sent</h2>
              <p>
                Transaction hash:{" "}
                <a
                  href={`https://explore.testnet.tempo.xyz/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {transactionHash.slice(0, 6)}...{transactionHash.slice(-4)}
                </a>
              </p>
              <Button variant="secondary" className="tx-button" onClick={handleReset}>
                Send another transaction
              </Button>
            </>
          )}
        </>
      )}
    </>
  );
}

export default EOATransaction;
