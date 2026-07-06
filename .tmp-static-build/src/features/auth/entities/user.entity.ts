export interface User {
  id?: number;
  uid: string;
  phone: string;
  email?: string | null;
  password?: string;
  last_login_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}
