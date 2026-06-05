import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/config/supabase';
import { formatEth } from '@/lib/utils';
import { Plus, Lightning, Minus, Lock, Tag, CaretDown, ArrowUp, ArrowDown, Trash, ArrowSquareOut } from '@phosphor-icons/react';
import { useCategories } from '@/hooks/use-categories';
import { getCategoryIcon, availableIcons } from '@/lib/category-icons';
import { useToast } from '@/components/ui/toast';

const ADMIN_PASSPHRASE = import.meta.env.VITE_ADMIN_PASSPHRASE;
const RELAYER_URL = import.meta.env.VITE_RELAYER_URL || 'http://localhost:3001';
const STORAGE_KEY = 'rivalis_admin_auth';

interface MarketRule {
  title: string;
  description: string;
}

const MARKET_MECHANIC_RULES: MarketRule[] = [
  {
    title: 'How Tickets Work',
    description: 'Users can only buy tickets for the available outcomes. Purchased tickets cannot be sold back, transferred, or cancelled. Tickets can only be claimed after the market is resolved or a refund is available.',
  },
  {
    title: 'Market Close',
    description: 'The market will close around 30-60 minutes before the match or event starts. Once the match or event has started, users can no longer buy tickets.',
  },
  {
    title: 'Resolution Timing',
    description: 'Markets are normally resolved approximately 1 hour after the match or event has finished, once the official result is available and verified. In some cases, resolution may take longer and can be completed within 24-48 hours after the match or event ends, especially if official results, corrections, disputes, or reliable sources require additional confirmation.',
  },
];
function withMarketMechanics(rules: MarketRule[]) {
  return [...MARKET_MECHANIC_RULES, ...rules];
}

const RULE_TEMPLATES = [
  {
    key: 'football-3-outcomes',
    label: 'Football 3 Outcomes',
    rules: [
      { title: 'Market Description', description: 'This market refers to the football match between {TEAM_A} and {TEAM_B} in {COMPETITION}.' },
      { title: 'Outcome Team A', description: 'This market will resolve to "{TEAM_A}" if {TEAM_A} beats {TEAM_B} based on the full-time result.' },
      { title: 'Outcome Draw', description: 'This market will resolve to "Draw" if the match between {TEAM_A} and {TEAM_B} ends in a draw based on the full-time result.' },
      { title: 'Outcome Team B', description: 'This market will resolve to "{TEAM_B}" if {TEAM_B} beats {TEAM_A} based on the full-time result.' },
      { title: 'Full-Time Definition', description: 'Full time means the result after 90 minutes of normal time plus referee-added injury time. Extra time and penalty shootouts do not count for this market resolution. Example: if the score after 90 minutes + injury time is 1-1, then {TEAM_A} wins 2-1 after extra time, this market still resolves to "Draw".' },
      { title: 'Cancelled or Postponed Match', description: 'If the match is cancelled, not played at all, or postponed for more than 7 days from the scheduled date without an official result, all tickets will be refunded.' },
      { title: 'Match Started but Not Completed', description: 'If the match starts but is stopped before full time and no official full-time result is published, all tickets will be refunded. If the official authority declares a final full-time result, the market will be resolved based on that official result.' },
      { title: 'Walkover or Forfeit', description: 'If one team wins by walkover or forfeit before the match starts, all tickets will be refunded unless that result is officially recorded as a full-time result by the competition organizer.' },
      { title: 'Resolution Source', description: 'The primary resolution source is official information from the competition organizer, league, club, or relevant federation. Consensus from credible sports reports may also be used if the official source is unavailable or unclear.' },
    ],
  },
  {
    key: 'tennis-2-outcomes',
    label: 'Tennis ATP/WTA 2 Outcomes',
    rules: [
      { title: 'Market Description', description: 'This market refers to the tennis match between {PLAYER_A} and {PLAYER_B} at {TOURNAMENT}.' },
      { title: 'Outcome Player A', description: 'This market will resolve to "{PLAYER_A}" if {PLAYER_A} advances against {PLAYER_B}.' },
      { title: 'Outcome Player B', description: 'This market will resolve to "{PLAYER_B}" if {PLAYER_B} advances against {PLAYER_A}.' },
      { title: 'Invalid Match Refund', description: 'If the match is cancelled, not played at all, ends in a draw, or is postponed for more than 7 days from the scheduled date without a determined winner, all tickets will be refunded.' },
      { title: 'Retirement or Disqualification', description: 'If the match starts but is not completed, and one player advances because the opponent retires, fails to continue, or is disqualified, this market will resolve to the player who advances.' },
      { title: 'Walkover', description: 'If the match ends as a walkover, meaning a player withdraws before the match starts and the other player advances automatically, all tickets will be refunded.' },
      { title: 'Resolution Source', description: 'The primary resolution source is official information from the ATP/WTA Tour. Consensus from credible reports may also be used.' },
    ],
  },
  {
    key: 'ufc-2-outcomes',
    label: 'UFC/MMA 2 Outcomes',
    rules: [
      { title: 'Market Description', description: 'This market refers to the MMA/UFC bout between {FIGHTER_A} and {FIGHTER_B} at {EVENT_NAME}.' },
      { title: 'Outcome Fighter A', description: 'This market will resolve to "{FIGHTER_A}" if {FIGHTER_A} is officially declared the winner over {FIGHTER_B}.' },
      { title: 'Outcome Fighter B', description: 'This market will resolve to "{FIGHTER_B}" if {FIGHTER_B} is officially declared the winner over {FIGHTER_A}.' },
      { title: 'Counted Winning Methods', description: 'This market is resolved based on the official winner, including wins by KO/TKO, submission, decision, technical decision, disqualification, doctor stoppage, corner stoppage, or any other official winning method recognized by the promoter or athletic commission.' },
      { title: 'Draw, No Contest, or No Decision', description: 'If the bout ends as a draw, majority draw, split draw, no contest, or no decision, all tickets will be refunded.' },
      { title: 'Cancelled or Postponed Bout', description: 'If the bout is cancelled, does not take place at all, or is postponed for more than 7 days from the scheduled date without an official result, all tickets will be refunded.' },
      { title: 'Opponent Replacement', description: 'If either fighter is replaced and the bout is no longer between {FIGHTER_A} and {FIGHTER_B}, all tickets will be refunded. If both fighters remain the same but the card order, venue, or rounds change, the market remains valid as long as the bout takes place and produces an official winner.' },
      { title: 'Round or Weight Class Changes', description: 'If the number of rounds, weight class, or bout status changes, the market remains valid as long as both fighters remain the same and the bout produces an official winner.' },
      { title: 'Resolution Source', description: 'The primary resolution source is the official result from UFC, the event promoter, or the authorized athletic commission. Consensus from credible MMA reports may also be used if the official source is unavailable or unclear.' },
    ],
  },
  {
    key: 'boxing-2-outcomes',
    label: 'Boxing 2 Outcomes',
    rules: [
      { title: 'Market Description', description: 'This market refers to the boxing match between {BOXER_A} and {BOXER_B} at {EVENT_NAME}.' },
      { title: 'Outcome Boxer A', description: 'This market will resolve to "{BOXER_A}" if {BOXER_A} is officially declared the winner over {BOXER_B}.' },
      { title: 'Outcome Boxer B', description: 'This market will resolve to "{BOXER_B}" if {BOXER_B} is officially declared the winner over {BOXER_A}.' },
      { title: 'Counted Winning Methods', description: 'This market is resolved based on the official winner, including wins by KO, TKO, unanimous decision, split decision, majority decision, technical decision, retirement, corner stoppage, doctor stoppage, disqualification, or any other official winning method recognized by the promoter or boxing commission.' },
      { title: 'Draw, No Contest, or No Decision', description: 'If the match ends as a draw, majority draw, split draw, no contest, or no decision, all tickets will be refunded.' },
      { title: 'Cancelled or Postponed Match', description: 'If the match is cancelled, does not take place at all, or is postponed for more than 7 days from the scheduled date without an official result, all tickets will be refunded.' },
      { title: 'Opponent Replacement', description: 'If either boxer is replaced and the match is no longer between {BOXER_A} and {BOXER_B}, all tickets will be refunded. If both boxers remain the same but the venue, card order, number of rounds, or title status changes, the market remains valid as long as the match produces an official winner.' },
      { title: 'Round or Weight Class Changes', description: 'If the number of rounds, weight class, or title status changes, the market remains valid as long as both boxers remain the same and the match produces an official winner.' },
      { title: 'Resolution Source', description: 'The primary resolution source is the official result from the fight promoter, authorized boxing commission, or relevant boxing organization. Consensus from credible boxing reports may also be used if the official source is unavailable or unclear.' },
    ],
  },
  {
    key: 'racing-winner-multi',
    label: 'F1/MotoGP Race Winner',
    rules: [
      { title: 'Market Description', description: 'This market refers to who will become the official race winner at {RACE_NAME}. Each outcome represents one driver/rider available in this market.' },
      { title: 'Winning Outcome', description: 'This market will resolve to the driver/rider outcome recorded as the official race winner / P1 in the official race result. Only one outcome will be the winner.' },
      { title: 'Resolution Basis', description: 'This market is resolved based on the official main race result. For F1, the result refers to the main Formula 1 race, not qualifying, sprint, practice, or any other session unless explicitly stated in the market title. For MotoGP, the result refers to the main MotoGP race, not qualifying, practice, warm-up, or sprint race unless explicitly stated in the market title.' },
      { title: 'Driver/Rider Did Not Start or Finish', description: 'If a specific driver/rider does not start, retires, does not finish, or is not classified, that driver/rider outcome does not win. The market remains valid as long as the race produces an official winner.' },
      { title: 'Race Cancelled or Postponed', description: 'If the race is cancelled, does not take place at all, or is postponed for more than 7 days from the scheduled date without an official winner, all tickets will be refunded.' },
      { title: 'Race Stopped Early', description: 'If the race is stopped early but the official organizer declares a final result and official winner, the market will be resolved based on that official result. If no official winner is determined, all tickets will be refunded.' },
      { title: 'Penalties and Disqualification', description: 'Time penalties, position penalties, and disqualifications reflected in the official race result will count for market resolution. If the official result changes before the market is resolved, the market will follow the latest official result available at the time of resolution.' },
      { title: 'Winner Not Listed as an Outcome', description: 'If the official race winner is a driver/rider not available as an outcome in this market, all tickets will be refunded unless the market provides an "Other" outcome. If an "Other" outcome is available, "Other" will be the winning outcome.' },
      { title: 'Resolution Source', description: 'The primary resolution source is the official result from Formula 1/FIA for F1, and MotoGP/FIM/Dorna for MotoGP. Consensus from credible motorsport reports may also be used if the official source is unavailable or unclear.' },
    ],
  },
  {
    key: 'nba-2-outcomes',
    label: 'NBA 2 Outcomes',
    rules: [
      { title: 'Market Description', description: 'This market refers to the match between {TEAM_A} and {TEAM_B} in {COMPETITION}.' },
      { title: 'Outcome Team A', description: 'This market will resolve to "{TEAM_A}" if {TEAM_A} is officially declared the winner over {TEAM_B}.' },
      { title: 'Outcome Team B', description: 'This market will resolve to "{TEAM_B}" if {TEAM_B} is officially declared the winner over {TEAM_A}.' },
      { title: 'Overtime', description: 'Overtime counts for this market resolution. The market is resolved based on the official final result, including overtime if played.' },
      { title: 'Cancelled or Postponed Match', description: 'If the match is cancelled, not played at all, or postponed for more than 7 days from the scheduled date without an official result, all tickets will be refunded.' },
      { title: 'Match Started but Not Completed', description: 'If the match starts but is not completed and no official final result is published, all tickets will be refunded. If NBA or the official authority declares a final result, the market will be resolved based on that official result.' },
      { title: 'Venue or Schedule Changes', description: 'If the venue, match time, or schedule changes, the market remains valid as long as the match still takes place between {TEAM_A} and {TEAM_B} and produces an official winner.' },
      { title: 'Team or Opponent Replacement', description: 'If either team is replaced and the match is no longer between {TEAM_A} and {TEAM_B}, all tickets will be refunded.' },
      { title: 'Resolution Source', description: 'The primary resolution source is the official result from NBA. Consensus from credible sports reports may also be used if the official source is unavailable or unclear.' },
    ],
  },
  {
    key: 'nfl-2-outcomes',
    label: 'NFL 2 Outcomes',
    rules: [
      { title: 'Market Description', description: 'This market refers to the match between {TEAM_A} and {TEAM_B} in {COMPETITION}.' },
      { title: 'Outcome Team A', description: 'This market will resolve to "{TEAM_A}" if {TEAM_A} is officially declared the winner over {TEAM_B}.' },
      { title: 'Outcome Team B', description: 'This market will resolve to "{TEAM_B}" if {TEAM_B} is officially declared the winner over {TEAM_A}.' },
      { title: 'Overtime', description: 'Overtime counts for this market resolution. The market is resolved based on the official final result, including overtime if played.' },
      { title: 'Tie Result', description: 'If the match is tied after regulation but produces a winner after overtime, the market will be resolved based on that winner. If the official final result remains tied after overtime, all tickets will be refunded.' },
      { title: 'Cancelled or Postponed Match', description: 'If the match is cancelled, not played at all, or postponed for more than 7 days from the scheduled date without an official result, all tickets will be refunded.' },
      { title: 'Match Started but Not Completed', description: 'If the match starts but is not completed and no official final result is published, all tickets will be refunded. If NFL or the official authority declares a final result, the market will be resolved based on that official result.' },
      { title: 'Venue or Schedule Changes', description: 'If the venue, match time, or schedule changes, the market remains valid as long as the match still takes place between {TEAM_A} and {TEAM_B} and produces an official winner.' },
      { title: 'Team or Opponent Replacement', description: 'If either team is replaced and the match is no longer between {TEAM_A} and {TEAM_B}, all tickets will be refunded.' },
      { title: 'Resolution Source', description: 'The primary resolution source is the official result from NFL. Consensus from credible sports reports may also be used if the official source is unavailable or unclear.' },
    ],
  },
] as const;

const DEFAULT_TEMPLATE_KEY = 'football-3-outcomes';
const DEFAULT_MARKET_RULES: readonly MarketRule[] = RULE_TEMPLATES[0].rules;

function cloneRules(rules: readonly MarketRule[]) {
  return withMarketMechanics(rules.map((rule) => ({ ...rule })));
}

function cloneDefaultRules() {
  return cloneRules(DEFAULT_MARKET_RULES);
}

function replaceRulePlaceholders(rules: MarketRule[], outcomes: string[], eventName: string) {
  const first = outcomes[0] || '';
  const second = outcomes[1] || '';
  const last = outcomes[outcomes.length - 1] || second || first;
  const event = eventName.trim() || 'the scheduled event';

  const replacements: Record<string, string> = {
    '{PLAYER_A}': first,
    '{PLAYER_B}': second,
    '{TEAM_A}': first,
    '{TEAM_B}': outcomes.length === 3 && second.toLowerCase() === 'draw' ? last : second,
    '{FIGHTER_A}': first,
    '{FIGHTER_B}': second,
    '{BOXER_A}': first,
    '{BOXER_B}': second,
    '{DRIVER_A}': first,
    '{DRIVER_B}': second,
    '{RIDER_A}': first,
    '{RIDER_B}': second,
    '{TOURNAMENT}': event,
    '{COMPETITION}': event,
    '{EVENT_NAME}': event,
    '{GRAND_PRIX}': event,
    '{RACE_NAME}': event,
  };

  function replaceText(text: string) {
    return Object.entries(replacements).reduce(
      (result, [placeholder, value]) => result.replaceAll(placeholder, value || placeholder),
      text
    );
  }

  return rules.map((rule) => ({
    title: replaceText(rule.title),
    description: replaceText(rule.description),
  }));
}

let relayerPassphrase = '';

function getWibDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return {
    year: Number(parts.find((p) => p.type === 'year')?.value),
    month: Number(parts.find((p) => p.type === 'month')?.value),
    day: Number(parts.find((p) => p.type === 'day')?.value),
  };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function buildWibCloseDate(dayInput: string, hourInput: string, minuteInput: string) {
  const hour = Number(hourInput);
  const minute = Number(minuteInput);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

  const now = getWibDateParts();
  const day = dayInput.trim() ? Number(dayInput) : now.day;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;

  let year = now.year;
  let month = now.month;

  if (dayInput.trim() && day < now.day) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  if (day > getDaysInMonth(year, month)) return null;

  const timestampMs = Date.UTC(year, month - 1, day, hour - 7, minute, 0);
  return {
    timestamp: Math.floor(timestampMs / 1000),
    label: `${day}/${month}/${year} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} WIB`,
  };
}

async function adminFetch(endpoint: string, body?: any) {
  const res = await fetch(`${RELAYER_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${relayerPassphrase}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function AdminPage() {
  const [layer1Auth, setLayer1Auth] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
  const [layer2Auth, setLayer2Auth] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);
  const [relayerInput, setRelayerInput] = useState('');
  const [relayerError, setRelayerError] = useState(false);
  const [relayerLoading, setRelayerLoading] = useState(false);

  function handleLayer1Submit(e: React.FormEvent) {
    e.preventDefault();
    if (passInput === ADMIN_PASSPHRASE) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setLayer1Auth(true);
      setPassError(false);
    } else {
      setPassError(true);
    }
  }

  async function handleLayer2Submit(e: React.FormEvent) {
    e.preventDefault();
    setRelayerLoading(true);
    setRelayerError(false);

    try {
      const res = await fetch(`${RELAYER_URL}/admin/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${relayerInput}`,
        },
      });
      if (res.ok) {
        relayerPassphrase = relayerInput;
        setLayer2Auth(true);
      } else {
        setRelayerError(true);
      }
    } catch {
      setRelayerError(true);
    } finally {
      setRelayerLoading(false);
    }
  }

  if (!layer1Auth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-full max-w-[340px] rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-black/40">
          <div className="flex flex-col items-center">
            <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-5">
              <Lock size={24} className="text-accent" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-1">Admin Access</h2>
            <p className="text-[13px] text-muted-foreground mb-6">Enter passphrase to continue</p>
            <form onSubmit={handleLayer1Submit} className="flex flex-col gap-3 w-full">
              <input
                type="password"
                value={passInput}
                onChange={(e) => { setPassInput(e.target.value); setPassError(false); }}
                placeholder="••••••••••"
                className={`w-full rounded-lg border bg-background px-4 py-3 text-sm text-foreground text-center outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/30 ${passError ? 'border-danger' : 'border-border'}`}
                autoFocus
              />
              {passError && <p className="text-[11px] text-danger text-center">Invalid passphrase</p>}
              <Button type="submit" size="lg" className="w-full">
                Unlock
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!layer2Auth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-full max-w-[340px] rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-black/40">
          <div className="flex flex-col items-center">
            <div className="h-14 w-14 rounded-2xl bg-warning/10 flex items-center justify-center mb-5">
              <Lock size={24} className="text-warning" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-1">Server Auth</h2>
            <p className="text-[13px] text-muted-foreground mb-6">Enter server passphrase</p>
            <form onSubmit={handleLayer2Submit} className="flex flex-col gap-3 w-full">
              <input
                type="password"
                value={relayerInput}
                onChange={(e) => { setRelayerInput(e.target.value); setRelayerError(false); }}
                placeholder="••••••••••"
                className={`w-full rounded-lg border bg-background px-4 py-3 text-sm text-foreground text-center outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/30 ${relayerError ? 'border-danger' : 'border-border'}`}
                autoFocus
              />
              {relayerError && <p className="text-[11px] text-danger text-center">Invalid server passphrase</p>}
              <Button type="submit" size="lg" className="w-full" loading={relayerLoading}>
                Verify
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-7xl">
        <AdminStats />

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <CreateMarketForm />
          <ResolveMarketForm />
        </div>

        <div className="mt-5">
          <ManageCategoriesForm />
        </div>
      </div>
    </div>
  );
}

function AdminStats() {
  const [stats, setStats] = useState({
    totalTickets: 0,
    uniqueUsers: 0,
    totalFee: '0',
    totalVolume: '0',
    totalResolved: 0,
    totalClaimed: '0',
  });

  useEffect(() => {
    async function fetchStats() {
      const [ticketsRes, usersRes, marketsRes, resolvedRes, claimsRes] = await Promise.all([
        supabase.from('tickets').select('quantity, total_paid'),
        supabase.from('tickets').select('user_address'),
        supabase.from('markets').select('total_fee_collected, total_pool'),
        supabase.from('markets').select('id').eq('status', 'RESOLVED'),
        supabase.from('claims').select('amount'),
      ]);

      const tickets = ticketsRes.data || [];
      const totalTickets = tickets.reduce((sum, t: any) => sum + t.quantity, 0);
      const totalVolume = tickets.reduce((sum, t: any) => sum + BigInt(t.total_paid), 0n).toString();

      const uniqueUsers = new Set((usersRes.data || []).map((t: any) => t.user_address)).size;

      const markets = marketsRes.data || [];
      const totalFee = markets.reduce((sum, m: any) => sum + BigInt(m.total_fee_collected), 0n).toString();

      const totalResolved = (resolvedRes.data || []).length;

      const claims = claimsRes.data || [];
      const totalClaimed = claims.reduce((sum, c: any) => sum + BigInt(c.amount), 0n).toString();

      setStats({ totalTickets, uniqueUsers, totalFee, totalVolume, totalResolved, totalClaimed });
    }

    fetchStats();
  }, []);

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3">
      <Card className="p-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Tickets</p>
        <p className="mt-1 font-mono text-lg font-semibold text-foreground">{stats.totalTickets}</p>
      </Card>
      <Card className="p-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Unique Users</p>
        <p className="mt-1 font-mono text-lg font-semibold text-foreground">{stats.uniqueUsers}</p>
      </Card>
      <Card className="p-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue (Fee)</p>
        <p className="mt-1 font-mono text-lg font-semibold text-accent">{formatEth(stats.totalFee)} zkLTC</p>
      </Card>
      <Card className="p-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Volume</p>
        <p className="mt-1 font-mono text-lg font-semibold text-foreground">{formatEth(stats.totalVolume)} zkLTC</p>
      </Card>
      <Card className="p-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Markets Resolved</p>
        <p className="mt-1 font-mono text-lg font-semibold text-foreground">{stats.totalResolved}</p>
      </Card>
      <Card className="p-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Claimed</p>
        <p className="mt-1 font-mono text-lg font-semibold text-foreground">{formatEth(stats.totalClaimed)} zkLTC</p>
      </Card>
    </div>
  );
}

function CreateMarketForm() {
  const [title, setTitle] = useState('');
  const [eventName, setEventName] = useState('');
  const [outcomes, setOutcomes] = useState(['', '']);
  const [ticketPrice, setTicketPrice] = useState('0.001');
  const [fee, setFee] = useState('0.0001');
  const [closeDay, setCloseDay] = useState('');
  const [closeHour, setCloseHour] = useState('');
  const [closeMinute, setCloseMinute] = useState('');
  const [matchUrl, setMatchUrl] = useState('');
  const [rulesMode, setRulesMode] = useState<'template' | 'custom'>('template');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(DEFAULT_TEMPLATE_KEY);
  const [rulesTemplateOpen, setRulesTemplateOpen] = useState(false);
  const [rules, setRules] = useState<MarketRule[]>(() => cloneDefaultRules());
  const rulesSwitchRef = useRef<HTMLDivElement>(null);
  const [rulesIndicatorStyle, setRulesIndicatorStyle] = useState({ left: 0, width: 0 });
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { categories } = useCategories();
  const { toast, dismiss } = useToast();

  const closePreview = buildWibCloseDate(closeDay, closeHour, closeMinute);

  useLayoutEffect(() => {
    if (!rulesSwitchRef.current) return;
    const activeBtn = rulesSwitchRef.current.querySelector('[data-active="true"]') as HTMLElement;
    if (activeBtn) {
      setRulesIndicatorStyle({ left: activeBtn.offsetLeft, width: activeBtn.offsetWidth });
    }
  }, [rulesMode]);

  async function handleCreate() {
    const outcomeList = outcomes.map((o) => o.trim()).filter(Boolean);
    if (outcomeList.length < 2 || !title || !closePreview || !categoryId) return;

    const closeTimestamp = closePreview.timestamp;

    setLoading(true);
    const id = toast('loading', 'Creating market...');

    try {
      await adminFetch('/admin/create-market', {
        title,
        description: '',
        outcomes: outcomeList,
        ticketPrice,
        fee,
        closeTime: closeTimestamp,
        categoryId,
        matchUrl: matchUrl.trim() || undefined,
        rules: replaceRulePlaceholders(rules, outcomeList, eventName)
          .map((rule) => ({ title: rule.title.trim(), description: rule.description.trim() }))
          .filter((rule) => rule.title || rule.description),
      });
      dismiss(id);
      toast('success', `Market "${title}" created successfully!`);
      setTitle('');
      setEventName('');
      setOutcomes(['', '']);
      setCloseDay('');
      setCloseHour('');
      setCloseMinute('');
      setMatchUrl('');
      setRulesMode('template');
      setSelectedTemplateKey(DEFAULT_TEMPLATE_KEY);
      setRulesTemplateOpen(false);
      setRules(cloneDefaultRules());
      setCategoryId(null);
    } catch (err: any) {
      dismiss(id);
      toast('error', `Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function addOutcome() {
    setOutcomes([...outcomes, '']);
  }

  function removeOutcome(index: number) {
    if (outcomes.length <= 2) return;
    setOutcomes(outcomes.filter((_, i) => i !== index));
  }

  function updateOutcome(index: number, value: string) {
    const updated = [...outcomes];
    updated[index] = value;
    setOutcomes(updated);
  }

  function applyRuleTemplate(templateKey: string) {
    const template = RULE_TEMPLATES.find((item) => item.key === templateKey) || RULE_TEMPLATES[0];
    setSelectedTemplateKey(template.key);
    setRules(cloneRules(template.rules));
  }

  function updateRule(index: number, field: keyof MarketRule, value: string) {
    setRules((prev) => prev.map((rule, i) => i === index ? { ...rule, [field]: value } : rule));
  }

  function addRule() {
    setRules((prev) => [...prev, { title: '', description: '' }]);
  }

  function removeRule(index: number) {
    if (rules.length <= 1) return;
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  function moveRule(index: number, direction: 'up' | 'down') {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= rules.length) return;
    setRules((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
          <Plus size={14} className="text-accent" weight="bold" />
        </div>
        <h3 className="text-sm font-medium">Create Market</h3>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Arsenal vs Chelsea"
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Event / Competition Name</label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Roland Garros WTA / Premier League / Monaco Grand Prix"
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">Used to replace placeholders like {'{TOURNAMENT}'}, {'{COMPETITION}'}, and {'{RACE_NAME}'} in rules.</p>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Category</label>
          <div className="relative mt-1.5">
            <button
              type="button"
              onClick={() => setCategoryOpen(!categoryOpen)}
              className={`w-full flex items-center justify-between rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-colors ${categoryId ? 'text-foreground border-border' : 'text-muted-foreground/40 border-border'} focus:border-primary`}
            >
              <span className="flex items-center gap-2">
                {categoryId ? (() => {
                  const cat = categories.find(c => c.id === categoryId);
                  if (!cat) return 'Select category';
                  const IconComp = getCategoryIcon(cat.icon);
                  return <><IconComp size={14} className="text-muted-foreground" />{cat.name}</>;
                })() : 'Select category'}
              </span>
              <CaretDown size={14} className={`text-muted-foreground transition-transform ${categoryOpen ? 'rotate-180' : ''}`} />
            </button>
            {categoryOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-xl shadow-black/30 max-h-48 overflow-y-auto">
                {categories.map((cat) => {
                  const IconComp = getCategoryIcon(cat.icon);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setCategoryId(cat.id); setCategoryOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-muted ${categoryId === cat.id ? 'text-primary bg-primary/5' : 'text-foreground'}`}
                    >
                      <IconComp size={14} className="text-muted-foreground shrink-0" />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Outcomes</label>
            <button
              onClick={addOutcome}
              className="flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent/80 transition-colors"
            >
              <Plus size={11} weight="bold" />
              Add
            </button>
          </div>
          <div className="mt-1.5 space-y-2">
            {outcomes.map((outcome, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={outcome}
                  onChange={(e) => updateOutcome(i, e.target.value)}
                  placeholder={`Outcome ${i + 1}`}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
                />
                {outcomes.length > 2 && (
                  <button
                    onClick={() => removeOutcome(i)}
                    className="shrink-0 h-9 w-9 rounded-lg border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-danger hover:border-danger/30 transition-colors"
                  >
                    <Minus size={13} weight="bold" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Price (zkLTC)</label>
            <input
              type="text"
              value={ticketPrice}
              onChange={(e) => setTicketPrice(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Fee (zkLTC)</label>
            <input
              type="text"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Close Time (WIB)</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            <input
              type="number"
              min={1}
              max={31}
              value={closeDay}
              onChange={(e) => setCloseDay(e.target.value)}
              placeholder="DAY"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
            />
            <input
              type="number"
              min={0}
              max={23}
              value={closeHour}
              onChange={(e) => setCloseHour(e.target.value)}
              placeholder="HOUR"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
            />
            <input
              type="number"
              min={0}
              max={59}
              value={closeMinute}
              onChange={(e) => setCloseMinute(e.target.value)}
              placeholder="MIN"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
            />
          </div>
          <p className={`mt-1.5 text-[11px] ${closePreview ? 'text-muted-foreground' : 'text-warning'}`}>
            {closeHour || closeMinute || closeDay
              ? closePreview ? `Close time: ${closePreview.label}` : 'Invalid close time input'
              : 'DAY optional. Empty DAY uses today in WIB.'}
          </p>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Match Detail URL (Optional)</label>
          <div className="relative mt-1.5">
            <ArrowSquareOut size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="url"
              value={matchUrl}
              onChange={(e) => setMatchUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
            />
          </div>
        </div>
        <Button className="w-full mt-1" size="lg" onClick={handleCreate} loading={loading}>
          Create Market
        </Button>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Rules</label>
            <div ref={rulesSwitchRef} className="relative flex rounded-md border border-border bg-background p-0.5">
              <div
                className="absolute rounded bg-accent transition-all duration-300 ease-[var(--ease-out)]"
                style={{ left: rulesIndicatorStyle.left, width: rulesIndicatorStyle.width, top: 2, bottom: 2 }}
              />
              {(['template', 'custom'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  data-active={rulesMode === mode}
                  onClick={() => setRulesMode(mode)}
                  className={`relative z-10 rounded px-2.5 py-1 text-[11px] font-medium uppercase transition-colors ${
                    rulesMode === mode ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {mode === 'template' ? 'Template' : 'Custom'}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => setRulesTemplateOpen(!rulesTemplateOpen)}
              className="w-full flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            >
              <span>{RULE_TEMPLATES.find((template) => template.key === selectedTemplateKey)?.label || 'Select rules template'}</span>
              <CaretDown size={14} className={`text-muted-foreground transition-transform ${rulesTemplateOpen ? 'rotate-180' : ''}`} />
            </button>
            {rulesTemplateOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-xl shadow-black/30 max-h-56 overflow-y-auto">
                {RULE_TEMPLATES.map((template) => (
                  <button
                    key={template.key}
                    type="button"
                    onClick={() => { applyRuleTemplate(template.key); setRulesTemplateOpen(false); }}
                    className={`w-full flex items-center px-3 py-2 text-sm text-left transition-colors hover:bg-muted ${selectedTemplateKey === template.key ? 'text-primary bg-primary/5' : 'text-foreground'}`}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {rulesMode === 'template' ? (
            <div className="mt-2 rounded-lg border border-border bg-background p-3 space-y-2.5">
              {rules.map((rule, index) => (
                <div key={index}>
                  <p className="text-[12px] font-medium text-foreground">{rule.title}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">{rule.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 rounded-lg border border-border bg-background overflow-hidden">
              <div className="grid grid-cols-[1fr_1.6fr_auto] gap-2 border-b border-border px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Title</span>
                <span>Description</span>
                <span>Action</span>
              </div>
              <div className="divide-y divide-border/60">
                {rules.map((rule, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1.6fr_auto] gap-2 p-2.5 items-start">
                    <input
                      type="text"
                      value={rule.title}
                      onChange={(e) => updateRule(index, 'title', e.target.value)}
                      placeholder="Rule title"
                      className="rounded-md border border-border bg-card px-2.5 py-2 text-xs text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
                    />
                    <textarea
                      value={rule.description}
                      onChange={(e) => updateRule(index, 'description', e.target.value)}
                      placeholder="Rule description"
                      rows={2}
                      className="resize-none rounded-md border border-border bg-card px-2.5 py-2 text-xs text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveRule(index, 'up')}
                        disabled={index === 0}
                        className="h-8 w-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                        title="Move up"
                      >
                        <ArrowUp size={12} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRule(index, 'down')}
                        disabled={index === rules.length - 1}
                        className="h-8 w-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                        title="Move down"
                      >
                        <ArrowDown size={12} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRule(index)}
                        disabled={rules.length <= 1}
                        className="h-8 w-8 rounded border border-danger/20 bg-danger/5 flex items-center justify-center text-danger hover:bg-danger/10 disabled:opacity-30 disabled:pointer-events-none"
                        title="Delete rule"
                      >
                        <Trash size={12} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addRule}
                className="flex w-full items-center justify-center gap-1.5 border-t border-border px-3 py-2 text-xs font-medium text-accent hover:bg-primary/5 transition-colors"
              >
                <Plus size={12} weight="bold" />
                Add Rule
              </button>
            </div>
          )}
        </div>

      </div>
    </Card>
  );
}

function ResolveMarketForm() {
  const [marketId, setMarketId] = useState('');
  const [winnerIndex, setWinnerIndex] = useState('');
  const [marketInfo, setMarketInfo] = useState<any>(null);
  const [statsInfo, setStatsInfo] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updateCloseDay, setUpdateCloseDay] = useState('');
  const [updateCloseHour, setUpdateCloseHour] = useState('');
  const [updateCloseMinute, setUpdateCloseMinute] = useState('');
  const updateClosePreview = buildWibCloseDate(updateCloseDay, updateCloseHour, updateCloseMinute);
  const { toast, dismiss } = useToast();

  async function handleFetch() {
    if (!marketId) return;
    setFetching(true);
    setMarketInfo(null);
    setStatsInfo([]);

    const [marketRes, statsRes] = await Promise.all([
      supabase.from('markets').select('*').eq('id', Number(marketId)).single(),
      supabase.from('market_stats').select('*').eq('market_id', Number(marketId)).order('outcome_index'),
    ]);

    setMarketInfo(marketRes.data);
    setStatsInfo(statsRes.data || []);
    setFetching(false);
  }

  async function handleAction(endpoint: string, body: any, label: string, refetchAfter = false) {
    setLoading(true);
    const id = toast('loading', `${label}...`);
    try {
      await adminFetch(endpoint, body);
      dismiss(id);
      toast('success', `${label} successful!`);
      if (refetchAfter) {
        setTimeout(() => handleFetch(), 1500);
      }
    } catch (err: any) {
      dismiss(id);
      toast('error', `${label} failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="h-7 w-7 rounded-lg bg-warning/10 flex items-center justify-center">
          <Lightning size={14} className="text-warning" weight="fill" />
        </div>
        <h3 className="text-sm font-medium">Market Actions</h3>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Market ID</label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
              placeholder="0"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
            />
            <button
              onClick={handleFetch}
              disabled={!marketId || fetching}
              className="shrink-0 rounded-md bg-accent px-3 py-2.5 text-xs font-medium text-background cursor-pointer hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              {fetching ? '...' : 'Fetch'}
            </button>
          </div>
        </div>

        {marketInfo && (
          <div className="rounded-lg border border-border bg-background p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground truncate">{marketInfo.title}</span>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded shrink-0 ml-2 ${
                marketInfo.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                marketInfo.status === 'RESOLVED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                marketInfo.status === 'CLOSED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                marketInfo.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                marketInfo.status === 'PAUSED' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                'bg-muted text-muted-foreground border border-border'
              }`}>{marketInfo.status}</span>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Outcomes</p>
              <div className="rounded-md border border-border overflow-hidden">
                {statsInfo.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 last:border-0">
                    <span className="font-mono text-xs text-foreground">
                      <span className="text-accent font-medium">[{s.outcome_index}]</span> {s.outcome_label}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{s.total_tickets} tickets</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pool</p>
                <p className="font-mono text-xs text-foreground mt-0.5">{formatEth(marketInfo.total_pool)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fee</p>
                <p className="font-mono text-xs text-foreground mt-0.5">{formatEth(marketInfo.total_fee_collected)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tickets</p>
                <p className="font-mono text-xs text-foreground mt-0.5">{marketInfo.total_tickets}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Close</p>
                <p className="font-mono text-xs text-foreground mt-0.5">{new Date(marketInfo.close_time).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short', hour12: false })}</p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-background p-3">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Update Close Time (WIB)</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            <input
              type="number"
              min={1}
              max={31}
              value={updateCloseDay}
              onChange={(e) => setUpdateCloseDay(e.target.value)}
              placeholder="DAY"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
            />
            <input
              type="number"
              min={0}
              max={23}
              value={updateCloseHour}
              onChange={(e) => setUpdateCloseHour(e.target.value)}
              placeholder="HOUR"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
            />
            <input
              type="number"
              min={0}
              max={59}
              value={updateCloseMinute}
              onChange={(e) => setUpdateCloseMinute(e.target.value)}
              placeholder="MIN"
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
            />
          </div>
          <p className={`mt-1.5 text-[11px] ${updateClosePreview ? 'text-muted-foreground' : 'text-warning'}`}>
            {updateCloseDay || updateCloseHour || updateCloseMinute
              ? updateClosePreview ? `New close time: ${updateClosePreview.label}` : 'Invalid close time input'
              : 'DAY optional. Empty DAY uses today in WIB.'}
          </p>
          <Button
            className="mt-2 w-full"
            size="md"
            onClick={() => handleAction('/admin/update-close-time', { marketId: Number(marketId), closeTime: updateClosePreview!.timestamp }, 'Update Close Time', true)}
            loading={loading}
            disabled={!marketId || !updateClosePreview}
          >
            Update Close Time
          </Button>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Winner Outcome Index</label>
          <input
            type="number"
            value={winnerIndex}
            onChange={(e) => setWinnerIndex(e.target.value)}
            placeholder="0"
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <Button onClick={() => handleAction('/admin/resolve-market', { marketId: Number(marketId), winningOutcome: Number(winnerIndex) }, 'Resolve')} loading={loading} disabled={!winnerIndex || !marketId} size="md">
            Resolve
          </Button>
          <Button variant="secondary" onClick={() => handleAction('/admin/resolve-refund', { marketId: Number(marketId) }, 'Refund')} loading={loading} disabled={!marketId} size="md">
            Resolve Refund
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" onClick={() => handleAction('/admin/cancel-market', { marketId: Number(marketId) }, 'Cancel')} loading={loading} disabled={!marketId} size="md">
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => handleAction('/admin/pause-market', { marketId: Number(marketId) }, 'Pause')} loading={loading} disabled={!marketId} size="md">
            Pause
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" onClick={() => handleAction('/admin/unpause-market', { marketId: Number(marketId) }, 'Unpause')} loading={loading} disabled={!marketId} size="md">
            Unpause
          </Button>
          <Button variant="secondary" onClick={() => handleAction('/admin/withdraw-fees', {}, 'Withdraw')} loading={loading} size="md">
            Withdraw
          </Button>
        </div>
      </div>
    </Card>
  );
}

function refreshCategories() {
  window.dispatchEvent(new Event('rivalis:categories-updated'));
}

function ManageCategoriesForm() {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tag');
  const [iconOpen, setIconOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { categories, loading: categoriesLoading } = useCategories();
  const { toast, dismiss } = useToast();

  async function handleCreate() {
    if (!name.trim()) return;

    setLoading(true);
    const id = toast('loading', 'Creating category...');

    try {
      await adminFetch('/admin/create-category', { name: name.trim(), icon });
      dismiss(id);
      toast('success', `Category "${name.trim()}" created!`);
      setName('');
      setIcon('tag');
      refreshCategories();
    } catch (err: any) {
      dismiss(id);
      toast('error', `Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(idToDelete: number, categoryName: string) {
    if (!confirm(`Delete category "${categoryName}"?`)) return;
    setActionLoading(true);
    const toastId = toast('loading', 'Deleting category...');

    try {
      await adminFetch('/admin/delete-category', { id: idToDelete });
      dismiss(toastId);
      toast('success', `Category "${categoryName}" deleted!`);
      refreshCategories();
    } catch (err: any) {
      dismiss(toastId);
      toast('error', `Delete failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const next = [...categories];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    setActionLoading(true);
    const toastId = toast('loading', 'Updating category order...');

    try {
      await adminFetch('/admin/reorder-categories', {
        orders: next.map((cat, i) => ({ id: cat.id, sort_order: i + 1 })),
      });
      dismiss(toastId);
      toast('success', 'Category order updated!');
      refreshCategories();
    } catch (err: any) {
      dismiss(toastId);
      toast('error', `Reorder failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Tag size={14} className="text-emerald-400" weight="bold" />
        </div>
        <h3 className="text-sm font-medium">Manage Categories</h3>
      </div>

      <div className="mb-4">
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Existing Categories</label>
        <div className="mt-1.5 space-y-1.5">
          {categoriesLoading ? (
            <span className="text-xs text-muted-foreground">Loading...</span>
          ) : categories.map((cat, index) => {
            const IconComp = getCategoryIcon(cat.icon);
            return (
              <div
                key={cat.id}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-[12px] text-muted-foreground"
              >
                <span className="font-mono text-[10px] text-muted-foreground/60 w-5">#{index + 1}</span>
                <IconComp size={13} className="shrink-0" />
                <span className="flex-1 text-foreground">{cat.name}</span>
                <button
                  type="button"
                  onClick={() => handleMove(index, 'up')}
                  disabled={index === 0 || actionLoading}
                  className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                  title="Move up"
                >
                  <ArrowUp size={12} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 'down')}
                  disabled={index === categories.length - 1 || actionLoading}
                  className="h-7 w-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                  title="Move down"
                >
                  <ArrowDown size={12} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cat.id, cat.name)}
                  disabled={actionLoading}
                  className="h-7 w-7 rounded border border-danger/20 bg-danger/5 flex items-center justify-center text-danger hover:bg-danger/10 disabled:opacity-30 disabled:pointer-events-none"
                  title="Delete category"
                >
                  <Trash size={12} weight="bold" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Add New Category</label>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/40"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIconOpen(!iconOpen)}
              className="w-full flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            >
              <span className="flex items-center gap-2">
                {(() => { const IconComp = getCategoryIcon(icon); return <IconComp size={14} className="text-muted-foreground" />; })()}
                {icon}
              </span>
              <CaretDown size={14} className={`text-muted-foreground transition-transform ${iconOpen ? 'rotate-180' : ''}`} />
            </button>
            {iconOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-xl shadow-black/30 max-h-48 overflow-y-auto">
                {availableIcons.map((iconName) => {
                  const IconComp = getCategoryIcon(iconName);
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => { setIcon(iconName); setIconOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-muted ${icon === iconName ? 'text-primary bg-primary/5' : 'text-foreground'}`}
                    >
                      <IconComp size={14} className="text-muted-foreground shrink-0" />
                      {iconName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <Button className="w-full" size="md" onClick={handleCreate} loading={loading} disabled={!name.trim()}>
          Add Category
        </Button>
      </div>
    </Card>
  );
}
