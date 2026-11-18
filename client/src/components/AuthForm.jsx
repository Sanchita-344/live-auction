import { useState, useEffect } from 'react';
import { Clock, Trophy, AlertCircle, Zap } from 'lucide-react';
import { api } from '../api';

export default function AuctionCard({ item, currentUser }) {
  const [bidAmount, setBidAmount] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [isEnded, setIsEnded] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(item.endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('ENDED');
        setIsEnded(true);
        setIsUrgent(false);
        return;
      }

      setIsEnded(false);
      setIsUrgent(diff <= 15000);

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [item.endTime]);

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    setError('');

    const numericBid = Number(bidAmount);
    if (!numericBid || numericBid <= item.currentBid) {
      setError(`Bid must be higher than ₹${item.currentBid}`);
      return;
    }

    setLoading(true);
    try {
      await api.post(`/items/${item._id}/bid`, { amount: numericBid });
      setBidAmount('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place bid');
    } finally {
      setLoading(false);
    }
  };

  const isOwner =
    currentUser &&
    (item.seller?._id === currentUser.id ||
      item.seller === currentUser.id ||
      item.seller?._id === currentUser._id);

  const leaderName = item.highestBidder?.name || null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:border-slate-700 transition">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-xl font-bold text-white leading-snug">{item.title}</h3>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
              isEnded
                ? 'bg-slate-800 text-slate-400'
                : isUrgent
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {timeLeft}
          </span>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          {item.description || 'No description provided.'}
        </p>

        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Current Highest Bid</span>
            <span>Start: ₹{item.startingPrice}</span>
          </div>
          <div className="text-3xl font-extrabold text-indigo-400 text-center my-2">
            ₹{item.currentBid}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-2">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Leader:{' '}
              <strong className="text-white">
                {leaderName ? leaderName : 'No bids yet'}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div>
        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isEnded ? (
          <div className="w-full py-2.5 px-4 rounded-xl bg-slate-800/70 border border-slate-700/70 text-center text-sm font-medium text-slate-300">
            {leaderName ? `Auction Ended • Winner: ${leaderName}` : 'Auction Ended • Unsold'}
          </div>
        ) : isOwner ? (
          <div className="w-full py-2.5 px-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-center text-sm font-medium text-indigo-300">
            Your Listed Item (Watching Live Bids)
          </div>
        ) : (
          <form onSubmit={handlePlaceBid} className="flex gap-2">
            <input
              type="number"
              min={item.currentBid + 1}
              placeholder={`Min ₹${item.currentBid + 50}`}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              {loading ? 'Bidding...' : 'Bid Now'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}