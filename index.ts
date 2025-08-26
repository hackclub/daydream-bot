import { App } from "@slack/bolt";
import cron from "node-cron";
import Airtable from "airtable";

const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const HOURS_LOOKBACK = 24;

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

async function sendLeaderboard() {
	const now = new Date();
	const dayAgo = new Date(now.getTime() - HOURS_LOOKBACK * 60 * 60 * 1000);

	const events = await base(process.env.AIRTABLE_EVENTS_TABLE)
		.select({ fields: ["location", "attendees"] })
		.all();

	const attendees = await base(process.env.AIRTABLE_ATTENDEES_TABLE)
		.select({ fields: ["signup_time"] })
		.all();

	const eventStats = events.map((event) => {
		const eventAttendees = (event.fields.attendees as string[]) || [];
		const totalSignups = eventAttendees.length;
		
		const recentSignups = eventAttendees.filter((attendeeId) => {
			const attendee = attendees.find((a) => a.id === attendeeId);
			if (!attendee?.fields.signup_time) return false;
			const signupTime = new Date(attendee.fields.signup_time as string);
			return signupTime >= dayAgo;
		}).length;

		return {
			name: event.fields.location as string,
			totalSignups,
			recentSignups,
		};
	});

	const topEvents = eventStats
		.sort((a, b) => b.recentSignups - a.recentSignups)
		.slice(0, 10);

	const leaderboard = topEvents
		.map((event, i) => `${i + 1}. ${event.name}: *+${event.recentSignups}* (\`${event.totalSignups} total\`)`)
		.join("\n");
    
    const message = `:trophy:  *Daydream Sign-Ups*

Top 10 events by new sign-ups:
${leaderboard}`;

	await app.client.chat.postMessage({
		channel: process.env.CHANNEL_ID as string,
		text: message,
	});
}

// schedule for 9 AM daily
cron.schedule("0 9 * * *", sendLeaderboard);

app.start();
console.log("Daydream bot running");

sendLeaderboard();
