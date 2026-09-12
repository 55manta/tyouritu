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
import EditCustomerScreen from '../screens/EditCustomerScreen';
import AddPianoScreen from '../screens/AddPianoScreen';
import EditPianoScreen from '../screens/EditPianoScreen';
import RecordFormScreen from '../screens/RecordFormScreen';
import SpotJobScreen from '../screens/SpotJobScreen';
import LedgerScreen from '../screens/LedgerScreen';
import SettingsScreen from '../screens/SettingsScreen';

import { dark, light } from '../theme/colors';
import { useScheme } from '../theme/ThemeContext';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/** 絵文字で示す。記号だけだと何を表すか伝わりにくく、高齢の利用者には特に見づらい */
function tabIcon(emoji: string) {
  return () => (
    <Text style={{ fontSize: 22 }}>{emoji}</Text>
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'ご案内', tabBarIcon: tabIcon('🔔') }} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: '予定', tabBarIcon: tabIcon('📅') }} />
      <Tab.Screen name="Customers" component={CustomersScreen} options={{ title: 'お客様', tabBarIcon: tabIcon('👤') }} />
      <Tab.Screen name="Record" component={RecordPickScreen} options={{ title: '記録', tabBarIcon: tabIcon('📝') }} />
      <Tab.Screen name="Revenue" component={RevenueScreen} options={{ title: '売上', tabBarIcon: tabIcon('💴') }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: '設定', tabBarIcon: tabIcon('⚙️') }} />
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
        <Stack.Screen name="EditCustomer" component={EditCustomerScreen} options={{ title: 'お客様を直す' }} />
        <Stack.Screen name="AddPiano" component={AddPianoScreen} options={{ title: 'ピアノを追加' }} />
        <Stack.Screen name="EditPiano" component={EditPianoScreen} options={{ title: 'ピアノを直す' }} />
        <Stack.Screen name="RecordForm" component={RecordFormScreen} options={{ title: '記録' }} />
        <Stack.Screen name="SpotJob" component={SpotJobScreen} options={{ title: '臨時のご依頼' }} />
        <Stack.Screen name="Ledger" component={LedgerScreen} options={{ title: '売上帳' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
