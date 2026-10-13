'use client';

import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Shuffle, 
  Calendar, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Trophy,
  ArrowLeft,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// --- Types ---
type Stage = {
  id: string;
  name: string;
};

type Participant = {
  id: string;
  name: string;
  institution: string;
  blindCode?: string; // e.g., 'A', 'B', 'C'
};

type EventStatus = 'pending' | 'allocating' | 'completed';

type StageEvent = {
  id: string;
  stageId: string;
  name: string;
  time: string;
  status: EventStatus;
  participants: Participant[];
  results?: { rank: number; participant: Participant }[];
};

// --- Mock Data ---
const MOCK_STAGES: Stage[] = [
  { id: 's1', name: 'Main Stage' },
  { id: 's2', name: 'Second Stage' },
  { id: 's3', name: 'Stage 3' },
  { id: 's4', name: 'Stage 4' },
  { id: 's4', name: 'Stage 5' },
  { id: 's4', name: 'Stage 6' },
  { id: 's4', name: 'Stage 7' },
  { id: 's4', name: 'Stage 8' },
  { id: 's4', name: 'Stage 9' },
  { id: 's10', name: 'Stage 10' },
];

const MOCK_PARTICIPANTS: Participant[] = [
  { id: 'p1', name: 'Ahmad Raza', institution: 'Darul Huda Islamic University' },
  { id: 'p2', name: 'Mohammed Ali', institution: 'Jamia Nooriyya Arabiyya' },
  { id: 'p3', name: 'Suhail KP', institution: 'Madeenathunnoor College' },
  { id: 'p4', name: 'Favas Rahman', institution: 'Markaz Garden' },
  { id: 'p5', name: 'Yaseen', institution: 'Jamia Hasaniyya' },
];

const MOCK_EVENTS: StageEvent[] = [
  { id: 'e1', stageId: 's1', name: 'Group Song', time: '10:30 AM', status: 'pending', participants: [...MOCK_PARTICIPANTS] },
  { id: 'e2', stageId: 's1', name: 'Arabic Speech', time: '12:00 PM', status: 'pending', participants: MOCK_PARTICIPANTS.slice(0, 3) },
  { id: 'e3', stageId: 's1', name: 'Debate', time: '03:00 PM', status: 'pending', participants: MOCK_PARTICIPANTS.slice(1, 4) },
  { id: 'e4', stageId: 's2', name: 'Urdu Poetry', time: '09:00 AM', status: 'pending', participants: MOCK_PARTICIPANTS.slice(2, 5) },
  { id: 'e5', stageId: 's2', name: 'English Essay', time: '11:00 AM', status: 'pending', participants: [...MOCK_PARTICIPANTS] },
];

export default function StageControllerApp() {
  const [stages] = useState<Stage[]>(MOCK_STAGES);
  const [events, setEvents] = useState<StageEvent[]>(MOCK_EVENTS);
  
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Derived state
  const selectedStage = stages.find(s => s.id === selectedStageId);
  const stageEvents = events.filter(e => e.stageId === selectedStageId);
  const selectedEvent = events.find(e => e.id === selectedEventId);

  // Handlers
  const handleStageSelect = (stageId: string) => {
    setSelectedStageId(stageId);
    setSelectedEventId(null); // Reset event selection when changing stages
  };

  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const handleRandomAllocate = (eventId: string) => {
    setEvents(prevEvents => prevEvents.map(event => {
      if (event.id === eventId) {
        // Create a shuffled copy of participants
        const shuffled = [...event.participants].sort(() => Math.random() - 0.5);
        // Assign blind codes (A, B, C...)
        const allocated = shuffled.map((p, index) => ({
          ...p,
          blindCode: String.fromCharCode(65 + index) // 65 is 'A'
        }));
        
        // Sort alphabetically by blind code for display
        allocated.sort((a, b) => (a.blindCode || '').localeCompare(b.blindCode || ''));

        return { ...event, status: 'allocating', participants: allocated };
      }
      return event;
    }));
  };

  const handleEndEvent = (eventId: string) => {
    setEvents(prevEvents => prevEvents.map(event => {
      if (event.id === eventId) {
        // Simulate results by picking top 3 randomly from the allocated participants
        const shuffledForResults = [...event.participants].sort(() => Math.random() - 0.5);
        const results = shuffledForResults.slice(0, 3).map((p, index) => ({
          rank: index + 1,
          participant: p
        }));
        return { ...event, status: 'completed', results };
      }
      return event;
    }));
  };

  const Header = () => (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">14TH WAFY ARTS FEST</h1>
        <span className="px-3 py-1 bg-slate-800 text-xs font-semibold text-slate-300 rounded-full border border-slate-700">
          STAGE CONTROLLER
        </span>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-sm text-slate-400">
          <Radio size={16} className="text-emerald-500 animate-pulse" />
          <span>Live Relay Active</span>
        </div>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      <Header />

      <main className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR: Stages List */}
        <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center">
              <MapPin size={16} className="mr-2" />
              Stage Name
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {stages.map((stage) => (
              <button
                key={stage.id}
                onClick={() => handleStageSelect(stage.id)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${
                  selectedStageId === stage.id
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] border'
                    : 'bg-slate-950/50 border border-transparent text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="font-medium">{stage.name}</span>
                <ChevronRight size={18} className={`transition-transform ${selectedStageId === stage.id ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
              </button>
            ))}
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <section className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
          
          {/* STATE 1: No Stage Selected */}
          {!selectedStage && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <div className="w-24 h-24 mb-6 rounded-full bg-slate-900 flex items-center justify-center shadow-inner border border-slate-800">
                <MapPin size={40} className="text-slate-600" />
              </div>
              <h3 className="text-xl font-medium text-slate-300 mb-2">Select a Stage</h3>
              <p className="max-w-md text-center text-sm">Choose a stage from the left panel to view its schedule, allocate blind codes, and manage events.</p>
            </div>
          )}

          {/* STATE 2: Stage Selected, Events List View */}
          {selectedStage && !selectedEvent && (
            <div className="flex-1 overflow-y-auto p-8 animate-in fade-in duration-300">
              <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">{selectedStage.name}</h2>
                  <p className="text-slate-400">Manage all events scheduled for this stage.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                    <h3 className="font-semibold text-slate-200 flex items-center">
                      <Calendar size={18} className="mr-2 text-blue-400" />
                      Events Schedule
                    </h3>
                  </div>
                  
                  {stageEvents.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No events scheduled for this stage.</div>
                  ) : (
                    <div className="divide-y divide-slate-800/50">
                      {stageEvents.map((event) => (
                        <div 
                          key={event.id}
                          onClick={() => handleEventSelect(event.id)}
                          className="p-4 hover:bg-slate-800/50 transition-colors cursor-pointer flex items-center group"
                        >
                          <div className="w-24 flex-shrink-0 text-sm font-medium text-emerald-400 flex items-center">
                            <Clock size={14} className="mr-1.5" />
                            {event.time}
                          </div>
                          
                          <div className="flex-1 px-4">
                            <h4 className="text-lg font-medium text-slate-200 group-hover:text-white transition-colors">{event.name}</h4>
                            <div className="flex items-center text-sm text-slate-500 mt-1">
                              <Users size={14} className="mr-1.5" />
                              {event.participants.length} Registrations
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                             {event.status === 'completed' && (
                                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-medium flex items-center">
                                  <CheckCircle2 size={12} className="mr-1" /> Finished
                                </span>
                             )}
                             {event.status === 'allocating' && (
                                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-medium">
                                  Allocated
                                </span>
                             )}
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors text-slate-400 border border-slate-700 group-hover:border-blue-500 shadow-sm">
                              <ChevronRight size={20} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: Event Detail (Allocation & Results) View */}
          {selectedStage && selectedEvent && (
            <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
              
              {/* Event Header */}
              <div className="bg-slate-900 border-b border-slate-800 px-8 py-6 flex-shrink-0">
                <button 
                  onClick={() => setSelectedEventId(null)}
                  className="flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-4"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Back to {selectedStage.name} Events
                </button>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs font-medium rounded-md border border-slate-700 flex items-center">
                        <Clock size={12} className="mr-1.5 text-emerald-400" />
                        {selectedEvent.time}
                      </span>
                      {selectedEvent.status === 'completed' && (
                         <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium rounded-md border border-blue-500/20">
                           Event Completed
                         </span>
                      )}
                    </div>
                    <h2 className="text-3xl font-bold text-white">{selectedEvent.name}</h2>
                  </div>
                  
                  {/* Actions Area */}
                  {selectedEvent.status === 'pending' && (
                    <button
                      onClick={() => handleRandomAllocate(selectedEvent.id)}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all flex items-center"
                    >
                      <Shuffle size={18} className="mr-2" />
                      Randomize & Allocate Codes
                    </button>
                  )}
                  {selectedEvent.status === 'allocating' && (
                    <button
                      onClick={() => handleEndEvent(selectedEvent.id)}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium shadow-lg shadow-emerald-500/20 transition-all flex items-center"
                    >
                      <CheckCircle2 size={18} className="mr-2" />
                      Mark Event Complete
                    </button>
                  )}
                </div>
              </div>

              {/* Event Content Area */}
              <div className="flex-1 overflow-y-auto p-8 bg-slate-950">
                <div className="max-w-5xl mx-auto space-y-8">
                  
                  {/* Allocation Table Section */}
                  {selectedEvent.status !== 'completed' ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                      <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">Allocate student to perform</h3>
                          <p className="text-sm text-slate-400 mt-1">Assign anonymous single-letter codes to conceal identity.</p>
                        </div>
                        {selectedEvent.status === 'pending' && (
                          <div className="flex items-center text-sm text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                            <AlertCircle size={16} className="mr-2" />
                            Pending Allocation
                          </div>
                        )}
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-950/50 text-slate-400 uppercase tracking-wider text-xs border-b border-slate-800">
                            <tr>
                              <th className="px-6 py-4 font-medium w-32">Blind Code</th>
                              <th className="px-6 py-4 font-medium">Participant Name</th>
                              <th className="px-6 py-4 font-medium">Institution</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {selectedEvent.participants.map((p, idx) => (
                              <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                                <td className="px-6 py-4">
                                  {p.blindCode ? (
                                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold text-lg shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                                      {p.blindCode}
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 font-mono">--</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-200">{p.name}</td>
                                <td className="px-6 py-4 text-slate-400">{p.institution}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Results Section */
                    <div className="space-y-6">
                       <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-2xl overflow-hidden shadow-2xl">
                          <div className="px-8 py-6 border-b border-indigo-500/20 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4 border border-indigo-500/30">
                              <Trophy size={32} className="text-indigo-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Event Results</h3>
                            <p className="text-slate-400">The allocated time is over. Here are the final standings for {selectedEvent.name}.</p>
                          </div>
                          
                          <div className="p-8">
                            <div className="grid gap-4">
                              {selectedEvent.results?.map((result) => (
                                <div 
                                  key={result.participant.id} 
                                  className={`flex items-center p-5 rounded-xl border relative overflow-hidden
                                    ${result.rank === 1 ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 
                                      result.rank === 2 ? 'bg-slate-300/10 border-slate-300/30' : 
                                      'bg-orange-500/10 border-orange-500/30'}`}
                                >
                                  {/* Rank Badge */}
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl mr-6 flex-shrink-0
                                    ${result.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg' : 
                                      result.rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900 shadow-lg' : 
                                      'bg-gradient-to-br from-orange-400 to-orange-700 text-white shadow-lg'}`}
                                  >
                                    {result.rank}
                                  </div>
                                  
                                  <div className="flex-1">
                                    <h4 className="text-xl font-bold text-white flex items-center">
                                      {result.participant.name}
                                      {result.participant.blindCode && (
                                        <span className="ml-3 text-sm font-normal px-2 py-0.5 bg-slate-950/50 rounded text-slate-400 border border-slate-800">
                                          Code {result.participant.blindCode}
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-slate-400 mt-1 flex items-center">
                                      <Users size={14} className="mr-1.5" />
                                      {result.participant.institution}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                       </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}