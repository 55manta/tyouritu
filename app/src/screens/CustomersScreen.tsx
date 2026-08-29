import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, Card, Empty, SaveAlert, StatusPill, Title } from '../components/ui';
import { dueDate } from '../lib/cycle';
import { fmtJ } from '../lib/date';
import {
  customerStatus, matches, pianoName, shortAddr, sortCustomers, SORTS, type SortKey,
} from '../lib/select';
import { useApp } from '../store/AppContext';
import { MIN_TAP, useColors } from '../theme/useColors';
import { FREE_LIMIT } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CustomersScreen() {
  const c = useColors();
  const nav = useNavigation<Nav>();
  const { customers, saveFailed, canAddCustomer } = useApp();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('due');

  const list = useMemo(
    () => sortCustomers(customers.filter((x) => matches(x, q)), sort),
    [customers, q, sort]
  );
  const pianoCount = list.reduce((s, x) => s + x.pianos.length, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.ground }} edges={['top']}>
      {saveFailed ? <SaveAlert /> : null}
      <View style={st.head}>
        <View style={st.headRow}>
          <Title>お客様</Title>
          <Button
            label="＋ 追加"
            onPress={() => nav.navigate('AddCustomer')}
            style={{ paddingHorizontal: 18 }}
          />
        </View>

        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="お名前・ご住所・ピアノ・製造番号で検索"
          placeholderTextColor={c.ink3}
          style={[st.search, { backgroundColor: c.surface, borderColor: c.line, color: c.ink }]}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.sorts}>
          {SORTS.map((s) => {
            const on = s.k === sort;
            return (
              <Pressable
                key={s.k}
                onPress={() => setSort(s.k)}
                style={[
                  st.sortBtn,
                  { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : c.lineStrong },
                ]}
              >
                <Text style={{ color: on ? c.onAccent : c.ink2, fontSize: 13, fontWeight: '700' }}>{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={{ color: c.ink2, fontSize: 13 }}>
          {q ? `${list.length}軒 / ${pianoCount}台が見つかりました` : `全 ${list.length}軒 / ${pianoCount}台`}
          {!canAddCustomer && `　（無料は${FREE_LIMIT}軒まで）`}
        </Text>
      </View>

      <FlatList
        data={list}
        keyExtractor={(x) => x.id}
        contentContainerStyle={st.pad}
        ListEmptyComponent={
          <Empty>
            {customers.length
              ? `「${q}」に該当するお客様がいません。`
              : 'まだお客様がいません。右上の「＋ 追加」から登録してください。'}
          </Empty>
        }
        renderItem={({ item }) => {
          const next = item.pianos.length ? dueDate(item.pianos.slice().sort((a, b) => +dueDate(a) - +dueDate(b))[0]) : null;
          return (
            <Pressable onPress={() => nav.navigate('CustomerDetail', { id: item.id })}>
              <Card style={{ marginBottom: 10 }}>
                <View style={st.rowTop}>
                  <Text style={[st.name, { color: c.ink, flexShrink: 1 }]}>
                    {item.name} 様
                    {item.pianos.length > 1 && (
                      <Text style={{ color: c.ink2, fontSize: 13, fontWeight: '600' }}>　{item.pianos.length}台</Text>
                    )}
                  </Text>
                  {item.pianos.length > 0 && <StatusPill status={customerStatus(item.pianos)} />}
                </View>
                <Text style={{ color: c.ink2, fontSize: 13.5 }}>{shortAddr(item)}</Text>
                <Text style={{ color: c.ink2, fontSize: 13 }} numberOfLines={1}>
                  {item.pianos.map(pianoName).join('・') || 'ピアノ未登録'}
                </Text>
                {next && (
                  <Text style={{ color: c.ink2, fontSize: 13 }}>次回 {fmtJ(next)}</Text>
                )}
              </Card>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  head: { paddingHorizontal: 18, paddingTop: 8, gap: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  search: {
    borderWidth: 1, borderRadius: 13, paddingHorizontal: 14,
    minHeight: MIN_TAP + 4, fontSize: 16,
  },
  sorts: { gap: 7, paddingVertical: 2 },
  sortBtn: {
    borderWidth: 1, borderRadius: 999, paddingHorizontal: 14,
    minHeight: MIN_TAP, justifyContent: 'center',
  },
  pad: { padding: 18, paddingTop: 12, paddingBottom: 40 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { fontSize: 17, fontWeight: '800' },
});
