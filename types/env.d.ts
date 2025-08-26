declare global {
	namespace NodeJS {
		interface ProcessEnv {
			SLACK_BOT_TOKEN: string;
			SLACK_SIGNING_SECRET: string;
			CHANNEL_ID: string;
			AIRTABLE_API_KEY: string;
			AIRTABLE_BASE_ID: string;
			AIRTABLE_ATTENDEES_TABLE: string;
			AIRTABLE_EVENTS_TABLE: string;
		}
	}
}

export {};