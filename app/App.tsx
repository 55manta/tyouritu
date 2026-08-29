import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import Navigation from './src/navigation';
import { AppProvider, useApp } from './src/store/AppContext';
import { ThemeProvider, useScheme } from './src/theme/ThemeContext';
import { useColors } from './src/theme/useColors';

function Gate() {
  const c = useColors();
  const scheme = useScheme();
  const { ready } = useApp();

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {ready ? (
        <Navigation />
      ) : (
        <View style={{ flex: 1, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.accent} />
        </View>
      )}
    </>
  );
}

/** 表示テーマは保存された設定で決まるので、AppProvider の内側に置く */
function Themed() {
  const { settings } = useApp();
  return (
    <ThemeProvider pref={settings.theme}>
      <Gate />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <Themed />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
