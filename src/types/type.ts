export type Team = {
   id: string;
   name: string;
};

export type Score = {
    home: number;
    away: number;
};

export type Match = {
    id: string;
    startsAt: string | null;
    status: string;
    minute?: number;
    home: Team;
    away: Team;
    score: Score | null;
};

export type MatchesResponse = {
    round: number;
    matches: Match[];
};

export type FilterId = 'all' | 'upcoming' | 'finished';
