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
	}).sort((a, b) => {
		if (b.recentSignups !== a.recentSignups) {
			return b.recentSignups - a.recentSignups;
		}
		return b.totalSignups - a.totalSignups;
	});

	const allEvents = eventStats.filter(event => event.recentSignups > 0);
	const topEvents = allEvents.slice(0, 10);
	let leaderboard = "";
	for (let i = 0; i < topEvents.length; i++) {
		const event = topEvents[i] as typeof topEvents[number];
		leaderboard += `${i + 1}. ${event.name}: *+${event.recentSignups}* (\`${event.totalSignups} total\`)`;
		if (i == 0 || event.recentSignups > 15) {
			leaderboard += " :fire:"
		}
		leaderboard += "\n"
	}
	
	let otherEvents = "";
	let lastCount = Infinity;
	for (let i = 10; i < allEvents.length; i++) {
		const event = allEvents[i] as typeof allEvents[number]
		if (event?.recentSignups < lastCount) {
			lastCount = event.recentSignups
			otherEvents += `> +${lastCount}: ${event.name} (\`${event.totalSignups}\`)`
		} else {
			otherEvents += `, ${event.name} (\`${event.totalSignups}\`)`
		}
	}
    
    let message = `:trophy:  *Daydream Sign-Ups*

Top 10 events by new sign-ups:
${leaderboard}`;
	
	if (allEvents.length > 10) {
		message += 	`
Other events with recent signups:
${otherEvents}`
	}

	await app.client.chat.postMessage({
		channel: process.env.CHANNEL_ID as string,
		text: message,
	});
}

// schedule for 9 AM and 9 PM daily
cron.schedule("0 9,21 * * *", sendLeaderboard);

app.start();
console.log("Daydream bot running");
