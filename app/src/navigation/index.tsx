import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import CustomersScreen from '../screens/CustomersScreen';
import RecordPickScreen from '../screens/RecordPickScreen';
import RevenueScreen from '../screens/RevenueScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import AddCustomerScreen from '../screens/AddCustomerScreen';
import AddPianoScreen from '../screens/AddPianoScreen';
import RecordFormScreen from '../screens/RecordFormScreen';
import LedgerScreen from '../screens/LedgerScreen';
import SettingsScreen from '../screens/SettingsScreen';

import { dark, light } from '../theme/colors';
import { useScheme } from '../theme/ThemeContext';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/** タブは文字だけで示す。アイコンだけだと高齢の利用者に伝わりにくい */
function tabIcon(label: string) {
  return ({ color }: { color: string }) => (
    <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Text>
  );
}

function Tabs() {
  const scheme = useScheme();
  const c = scheme === 'dark' ? dark : light;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accentInk,
        tabBarInactiveTintColor: c.ink2,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line, height: 64, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: '700' },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'ご案内', tabBarIcon: tabIcon('◎') }} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: '予定', tabBarIcon: tabIcon('▤') }} />
      <Tab.Screen name="Customers" component={CustomersScreen} options={{ title: 'お客様', tabBarIcon: tabIcon('☖') }} />
      <Tab.Screen name="Record" component={RecordPickScreen} options={{ title: '記録', tabBarIcon: tabIcon('✎') }} />
      <Tab.Screen name="Revenue" component={RevenueScreen} options={{ title: '売上', tabBarIcon: tabIcon('¥') }} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const scheme = useScheme();
  const c = scheme === 'dark' ? dark : light;
  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: c.ground,
      card: c.surface,
      text: c.ink,
      border: c.line,
      primary: c.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: c.surface },
          headerTintColor: c.ink,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'お客様' }} />
        <Stack.Screen name="AddCustomer" component={AddCustomerScreen} options={{ title: 'お客様を追加' }} />
        <Stack.Screen name="AddPiano" component={AddPianoScreen} options={{ title: 'ピアノを追加' }} />
        <Stack.Screen name="RecordForm" component={RecordFormScreen} options={{ title: '記録' }} />
        <Stack.Screen name="Ledger" component={LedgerScreen} options={{ title: '売上帳' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
