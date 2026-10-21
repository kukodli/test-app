import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

type Props = {
  // Момент последней успешной загрузки данных.
  since: Date;
};

// Подпись «Обновлено N сек назад».
export function UpdatedAgo({ since }: Props) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const update = () => {
      const elapsed = Math.floor((Date.now() - since.getTime()) / 1000);
      setSeconds(elapsed < 0 ? 0 : elapsed);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [since]);

  return <Text style={styles.text}>Обновлено {seconds} сек назад</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    color: '#6b7280',
  },
});
