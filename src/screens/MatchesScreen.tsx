import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FavoriteButton } from '../components/FavoriteButton';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { MATCHES_URL } from '../config';
import { useFavorites } from '../hooks/useFavorites';
import { FilterId, Match, MatchesResponse, Score, Team } from '../types/type';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'upcoming', label: 'Предстоящие' },
  { id: 'finished', label: 'Завершённые' },
];
function isTeam(value: unknown): value is Team {
  if (typeof value !== 'object' || value === null) return false;
  const team = value as Record<string, unknown>;
  return typeof team.id === 'string' && typeof team.name === 'string';
}
function isScore(value: unknown): value is Score {
  if (typeof value !== 'object' || value === null) return false;
  const score = value as Record<string, unknown>;
  return typeof score.home === 'number' && typeof score.away === 'number';
}
function isMatch(value: unknown): value is Match {
  if (typeof value !== 'object' || value === null) return false;
  const match = value as Record<string, unknown>;
  return (
    typeof match.id === 'string' &&
    (match.startsAt === null || typeof match.startsAt === 'string') &&
    typeof match.status === 'string' &&
    (match.minute === undefined || typeof match.minute === 'number') &&
    isTeam(match.home) &&
    isTeam(match.away) &&
    (match.score === null || isScore(match.score))
  );
}
function isMatchesResponse(value: unknown): value is MatchesResponse {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.round === 'number' &&
    Array.isArray(body.matches) &&
    body.matches.every(isMatch)
  );
}
function formatStartsAt(startsAt: string | null): string {
  if (!startsAt) return 'Дата не назначена';
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return 'Дата не назначена';
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}
function statusLabel(match: Match): string {
  switch (match.status) {
    case 'finished':
      return 'Завершён';
    case 'scheduled':
      return 'Предстоящий';
    case 'live':
      return typeof match.minute === 'number' ? `Идёт, ${match.minute}′` : 'Идёт';
    case 'postponed':
      return 'Перенесён';
    default:
      return match.status;
  }
}
function formatScore(score: Score | null): string | null {
  if (score === null) return null;
  return `${score.home}:${score.away}`;
}
function matchesFilter(match: Match, filter: FilterId): boolean {
  if (filter === 'all') return true;
  if (filter === 'finished') return match.status === 'finished';
  return match.status === 'scheduled' || match.status === 'postponed';
}

// Экран «Матчи тура» — задание в README.md, часть 1.
export function MatchesScreen() {
  const { isFavorite, toggle } = useFavorites();
  const [matches, setMatches] = useState<Match[]>([]);
  const [round, setRound] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterId>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const response = await fetch(MATCHES_URL);
      if (!response.ok) {
        throw new Error(`Сервер ответил ${response.status}`);
      }
      const body: unknown = await response.json();
      if (!isMatchesResponse(body)) {
        throw new Error('Неожиданный формат ответа');
      }
      setMatches(body.matches);
      setRound(body.round);
      setUpdatedAt(new Date());
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Не удалось загрузить матчи';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    void load('initial');
  }, [load]);
  const visible = matches.filter((match) => matchesFilter(match, filter));
  const showInitialLoading = loading && updatedAt === null;
  const showFullError = error !== null && updatedAt === null;
  const renderMatch = ({ item }: { item: Match }) => {
    const score = formatScore(item.score);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.teams}>
            <Text style={styles.team}>{item.home.name}</Text>
            <Text style={styles.team}>{item.away.name}</Text>
          </View>
          {score !== null ? <Text style={styles.score}>{score}</Text> : null}
          <FavoriteButton active={isFavorite(item.id)} onPress={() => toggle(item.id)} />
        </View>
        <Text style={styles.meta}>
          {formatStartsAt(item.startsAt)} · {statusLabel(item)}
        </Text>
      </View>
    );
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {round === null ? 'Матчи тура' : `Матчи тура · ${round}`}
      </Text>
      {updatedAt !== null ? (
        <View style={styles.toolbar}>
          <UpdatedAgo since={updatedAt} />
          <Pressable
            onPress={() => void load('refresh')}
            disabled={refreshing}
            accessibilityRole="button"
          >
            <Text style={styles.refreshText}>{refreshing ? 'Обновляем…' : 'Обновить'}</Text>
          </Pressable>
        </View>
      ) : null}
      {error !== null && updatedAt !== null ? <Text style={styles.banner}>{error}</Text> : null}
      {showInitialLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.hint}>Загружаем матчи…</Text>
        </View>
      ) : null}
      {showFullError ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Не удалось загрузить матчи</Text>
          <Text style={styles.hint}>{error}</Text>
          <Pressable
            style={styles.retry}
            onPress={() => void load('initial')}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Повторить</Text>
          </Pressable>
        </View>
      ) : null}
{updatedAt !== null ? (
        <>
          <View style={styles.filters}>
            {FILTERS.map((item) => {
              const selected = item.id === filter;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setFilter(item.id)}
                  style={[styles.chip, selected && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <FlatList
            style={styles.list}
            data={visible}
            keyExtractor={(item) => item.id}
            renderItem={renderMatch}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} />
            }
            contentContainerStyle={visible.length === 0 ? styles.emptyList : undefined}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.errorTitle}>
                  {matches.length === 0 ? 'Матчей пока нет' : 'В этой вкладке матчей нет'}
                </Text>
              </View>
            }
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  toolbar: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshText: {
    fontSize: 15,
    color: '#2563eb',
    fontWeight: '600',
  },
  banner: {
    marginTop: 8,
    color: '#b91c1c',
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  chipSelected: {
    backgroundColor: '#111827',
  },
  chipText: {
    fontSize: 14,
    color: '#111827',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  list: {
    flex: 1,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teams: {
    flex: 1,
    gap: 4,
  },
  team: {
    fontSize: 16,
    fontWeight: '600',
  },
  score: {
    fontSize: 20,
    fontWeight: '700',
  },
  meta: {
    marginTop: 8,
    fontSize: 13,
    color: '#4b5563',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hint: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  retry: {
    marginTop: 8,
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
