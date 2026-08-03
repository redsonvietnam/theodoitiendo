import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { AppState } from './types';

const DB_NAME = 'theodoitiendo-db';
const DB_VERSION = 1;
const STORE_NAME = 'app-state';
const KEY = 'main-state';

interface MyDB extends DBSchema {
    [STORE_NAME]: {
        key: string;
        value: AppState;
    };
}

let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null;

function getDb() {
    if (!dbPromise) {
        dbPromise = openDB<MyDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            },
        });
    }
    return dbPromise;
}

export async function getState(): Promise<AppState | undefined> {
    const db = await getDb();
    return db.get(STORE_NAME, KEY);
}

export async function setState(state: AppState): Promise<void> {
    const db = await getDb();
    await db.put(STORE_NAME, state, KEY);
}