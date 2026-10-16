import React, { useState, useEffect } from 'react';
import { GameSession, Player } from '../types';
import { getActiveSession, saveActiveSession } from '../utils/storage';
import { Play, Sparkles, User, Smile } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface PlayerJoinProps {
  initialPin?: string;
  onJoined: (session: GameSession, player: Player) => void;
}

export const PlayerJoin: React.FC<PlayerJoinProps> = ({
  initialPin = '',
  onJoined
}) => {
  const [pin, setPin] = useState(initialPin);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialPin) {
      setPin(initialPin);
    }
  }, [initialPin]);

  const avatars = ['🦊', '🐼', '🦄', '🦁', '🐯', '🐰', '🐸', '🤖', '🚀', '⭐', '🐱', '🐶'];

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || pin.trim().length !== 6) {
      setError('Please enter a valid 6-digit Game PIN.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your nickname.');
      return;
    }

    const session = getActiveSession(pin.trim());
    if (!session) {
      setError('Game session not found. Please check the PIN or make sure host is in the lobby.');
      return;
    }

    soundManager.playCorrect();
    const newPlayer: Player = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      avatar,
      score: 0,
      streak: 0,
      answers: {}
    };

    // Add player to session and save
    const updatedSession: GameSession = {
      ...session,
      players: [...(session.players || []), newPlayer]
    };
    saveActiveSession(updatedSession);
    onJoined(updatedSession, newPlayer);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-blue-900 border border-blue-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-yellow-400/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-yellow-400/30">
            <Play className="w-8 h-8 text-blue-950 fill-blue-950 ml-1" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Join Live Quiz</h2>
          <p className="text-xs text-blue-200 mt-1">Enter Game PIN and choose your player avatar</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">Game PIN *</label>
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. 849201"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-blue-950 border border-blue-700 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest text-yellow-400 placeholder-blue-500 focus:outline-none focus:border-yellow-400 shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">Your Nickname *</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
              <input
                type="text"
                maxLength={15}
                placeholder="e.g. TriviaMaster"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-blue-950 border border-blue-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder-blue-400 focus:outline-none focus:border-yellow-400 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">Choose Avatar</label>
            <div className="grid grid-cols-6 gap-2">
              {avatars.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => { soundManager.playClick(); setAvatar(av); }}
                  className={`h-11 rounded-xl text-xl flex items-center justify-center transition-all ${
                    avatar === av ? 'bg-yellow-400 text-blue-950 font-bold scale-105 shadow-lg shadow-yellow-400/30' : 'bg-blue-950 hover:bg-blue-800 border border-blue-700 text-white'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-black text-sm shadow-xl shadow-yellow-400/30 transition-transform transform hover:-translate-y-0.5"
          >
            Enter Game Lobby
          </button>
        </form>
      </div>
    </div>
  );
};
