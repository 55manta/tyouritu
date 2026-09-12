import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  CustomerDetail: { id: string };
  AddCustomer: undefined;
  EditCustomer: { id: string };
  AddPiano: { customerId: string };
  EditPiano: { customerId: string; pianoId: string };
  SpotJob: { customerId: string };
  RecordForm: { customerId: string; pianoId: string; recordId?: string };
  Ledger: undefined;
  Settings: undefined;
};

export type TabParamList = {
  Home: undefined;
  Schedule: undefined;
  Customers: undefined;
  Record: undefined;
  Revenue: undefined;
  SettingsTab: undefined;
};
