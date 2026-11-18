import { useState, useEffect } from "react";
import { api, socket } from "./api";
import AuthForm from "./components/AuthForm";
import { Gavel, Plus, Clock, LogOut, Wallet, Flame, Trophy, X } from "lucide-react";

function CountdownTimer({ endTime }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isEnded, setIsEnded] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("ENDED");
        setIsEnded(true);
        setIsUrgent(false);
        return;
      }
      setIsEnded(false);
      setIsUrgent(diff < 15000); // Red alert when under 15s
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}m ${secs < 10 ? "0" : ""}${secs}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        isEnded
          ? "bg-slate-800 text-slate-400"
          : isUrgent
          ? "bg-red-500/20 text-red-400 animate-pulse border border-red-500/40"
          : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
      }`}
    >
      <Clock className="w-3.5 h-3.5" />
      {timeLeft}
    </span>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [auctions, setAuctions] = useState([]);
  const [bidInputs, setBidInputs] = useState({});
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Create auction form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("5");

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!user) return;

    // Fetch existing auctions
    api.get("/auctions").then((res) => setAuctions(res.data));

    // Real-time listeners
    socket.on("auctionCreated", (newAuction) => {
      setAuctions((prev) => [newAuction, ...prev]);
    });

    socket.on("bidUpdated", ({ auction, antiSnipeTriggered }) => {
      setAuctions((prev) =>
        prev.map((item) => (item._id === auction._id ? auction : item))
      );
      if (antiSnipeTriggered) {
        showToast(`Anti-Sniping! "${auction.title}" ka timer +15s badh gaya!`, "warning");
      }
    });

    return () => {
      socket.off("auctionCreated");
      socket.off("bidUpdated");
    };
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const handleCreateAuction = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auctions", {
        title,
        description,
        startingPrice: Number(startingPrice),
        durationMinutes: Number(durationMinutes),
      });
      setTitle("");
      setDescription("");
      setStartingPrice("");
      setDurationMinutes("5");
      setShowModal(false);
      showToast("Naya item live auction par lag gaya!", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Auction create nahi ho paya", "error");
    }
  };

  const handlePlaceBid = async (auctionId, currentBid) => {
    const amount = Number(bidInputs[auctionId] || currentBid + 50);
    try {
      const { data } = await api.post(`/auctions/${auctionId}/bid`, { amount });
      setBidInputs((prev) => ({ ...prev, [auctionId]: "" }));
      showToast(data.message, "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Bid fail ho gayi", "error");
    }
  };

  if (!user) {
    return <AuthForm onAuthSuccess={setUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium ${
            toast.type === "error"
              ? "bg-red-950 border-red-500 text-red-200"
              : toast.type === "warning"
              ? "bg-amber-950 border-amber-500 text-amber-200"
              : "bg-indigo-950 border-indigo-500 text-indigo-200"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Gavel className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">LiveBid</h1>
              <p className="text-xs text-slate-400">Real-Time Atomic Auctions</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-sm">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">{user.name}</span>
              <span className="text-emerald-400 font-semibold">₹{user.balance}</span>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Item
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Auction Grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            Live & Recent Auctions ({auctions.length})
          </h2>
        </div>

        {auctions.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <p className="text-slate-400 mb-4">Abhi koi auction live nahi hai.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
            >
              + Pehla Item List Karo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((item) => {
              const isEnded = new Date(item.endTime).getTime() <= Date.now();
              const isOwner = item.createdBy === user.id || item.createdBy === user._id;

              return (
                <div
                  key={item._id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-bold text-lg text-white leading-snug">
                        {item.title}
                      </h3>
                      <CountdownTimer endTime={item.endTime} />
                    </div>

                    <p className="text-sm text-slate-400 mb-5 line-clamp-2">
                      {item.description || "No description provided."}
                    </p>

                    <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-400">Current Highest Bid</span>
                        <span className="text-xs text-slate-500">
                          Start: ₹{item.startingPrice}
                        </span>
                      </div>
                      <div className="text-2xl font-extrabold text-indigo-400">
                        ₹{item.currentBid}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-300">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          Leader: <strong>{item.highestBidderName}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bid Controls */}
                  {isEnded ? (
                    <div className="text-center py-2.5 bg-slate-800/60 rounded-lg text-xs text-slate-400 font-medium">
                      Auction Ended • Winner: {item.highestBidderName}
                    </div>
                  ) : isOwner ? (
                    <div className="text-center py-2.5 bg-indigo-950/40 border border-indigo-500/20 rounded-lg text-xs text-indigo-300">
                      Ye tumhara item hai (Live bids dekho)
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={item.currentBid + 1}
                        placeholder={`Min ₹${item.currentBid + 50}`}
                        value={bidInputs[item._id] || ""}
                        onChange={(e) =>
                          setBidInputs((prev) => ({
                            ...prev,
                            [item._id]: e.target.value,
                          }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => handlePlaceBid(item._id, item.currentBid)}
                        className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition cursor-pointer"
                      >
                        Bid Now
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Auction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">List New Auction Item</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAuction} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Item Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sony WH-1000XM5 Headphones"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Condition, box included, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Starting Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="500"
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Duration (Minutes)
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="1">1 Minute (Quick Test)</option>
                    <option value="5">5 Minutes</option>
                    <option value="15">15 Minutes</option>
                    <option value="60">1 Hour</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-lg font-medium text-sm transition cursor-pointer"
              >
                Start Live Auction
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}