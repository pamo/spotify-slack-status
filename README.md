# Listening Status for Slack

Remixed from ankur@slack-corp.com's [first pass](https://glitch.com/edit/#!/yummy-muse) at bringing back the glory days of AIM to Slack.


# How do I do the things?
1. Remix this shi:poop:
1. [create a spotify app](https://developer.spotify.com/dashboard/applications)
2. Grab the client ID and secret env vars from your app dashboard and add them to `.env`
3. [Create a slack app](https://api.slack.com/apps/) with `user.profile:write` scope permissions.
4. Add the app to your workspace and copy the `xoxp` token to `.env`
5. Open your app's index and finish the OAuth dance with Spotify, and bada-bing :dancer:, bada-boom :boom:

# Screenshot
![image](https://user-images.githubusercontent.com/784889/42721099-dffcb0b4-86e8-11e8-8947-c6389ca9636d.png)

