export type User = {
    id: string;
    firstName: string;
    lastName: string;
    password: string;
    email?: string;
    createdAt: Date;
    updatedAt: Date;
    role: 'user' | 'admin';
    provider?: 'local' | 'google' | 'facebook';
    phone?: string;
    address?: string;
    coutry?: string;
    city?: string;
    state?: string;
    postalCode?: string;
}

