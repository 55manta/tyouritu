import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import Navigation from './src/navigation';
import { AppProvider, useApp } from './src/store/AppContext';
import { dark, light } from './src/theme/colors';

function Gate() {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? dark : light;
  const { ready } = useApp();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }
  return <Navigation />;
}

export default function App() {
  const scheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Gate />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
