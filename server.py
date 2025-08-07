import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# Initialize the Flask app
app = Flask(__name__, static_folder='static')
# Enable Cross-Origin Resource Sharing (CORS)
CORS(app)

# --- In-Memory "Database" ---
song_queue = []
available_songs = [
    # (Your list of songs remains here)
    { "song_name": "Midnight Serenade", "artist": "Dreamweavers", "duration": "4:10", "audio_path": "assets/songs/midnight_serenade.mp3", "lyrics_path": "assets/lyrics/midnight_serenade.txt" },
    { "song_name": "Electric Dreams", "artist": "Synthwave Collective", "duration": "3:20", "audio_path": "assets/songs/electric_dreams.mp3", "lyrics_path": "assets/lyrics/electric_dreams.txt" },
    { "song_name": "Starlight Symphony", "artist": "Cosmic Echoes", "duration": "5:05", "audio_path": "assets/songs/starlight_symphony.mp3", "lyrics_path": "assets/lyrics/starlight_symphony.txt" },
    { "song_name": "Rhythm of the City", "artist": "Urban Beats", "duration": "3:55", "audio_path": "assets/songs/rhythm_of_the_city.mp3", "lyrics_path": "assets/lyrics/rhythm_of_the_city.txt" },
    { "song_name": "Whispering Pines", "artist": "Forest Folk", "duration": "2:40", "audio_path": "assets/songs/whispering_pines.mp3", "lyrics_path": "assets/lyrics/whispering_pines.txt" },
    { "song_name": "Neon Nights", "artist": "Chrome Crusaders", "duration": "4:30", "audio_path": "assets/songs/neon_nights.mp3", "lyrics_path": "assets/lyrics/neon_nights.txt" },
    { "song_name": "Ocean's Embrace", "artist": "Aqua Tones", "duration": "3:15", "audio_path": "assets/songs/ocean_embrace.mp3", "lyrics_path": "assets/lyrics/ocean_embrace.txt" },
    { "song_name": "Galactic Groove", "artist": "Astro Funk", "duration": "4:50", "audio_path": "assets/songs/galactic_groove.mp3", "lyrics_path": "assets/lyrics/galactic_groove.txt" },
    { "song_name": "Desert Bloom", "artist": "Sandstone Singers", "duration": "2:58", "audio_path": "assets/songs/desert_bloom.mp3", "lyrics_path": "assets/lyrics/desert_bloom.txt" },
    { "song_name": "Cybernetic Heartbeat", "artist": "Digital Pulse", "duration": "4:00", "audio_path": "assets/songs/cybernetic_heartbeat.mp3", "lyrics_path": "assets/lyrics/cybernetic_heartbeat.txt" },
    { "song_name": "Moonlit Dance", "artist": "Dreamweavers", "duration": "3:45", "audio_path": "assets/songs/moonlit_dance.mp3", "lyrics_path": "assets/lyrics/moonlit_dance.txt" },
    { "song_name": "Digital Dawn", "artist": "Digital Pulse", "duration": "3:30", "audio_path": "assets/songs/digital_dawn.mp3", "lyrics_path": "assets/lyrics/digital_dawn.txt" },
    { "song_name": "Man In The Mirror", "artist": "Michael Jackson", "duration": "5:19", "audio_path": "assets/songs/Man_In_The_Mirror.mp3", "lyrics_path": "assets/lyrics/man_in_the_mirror.txt" },
]

# --- Frontend Routes ---

@app.route('/')
def serve_index():
    """Serves the main index.html file."""
    # The 'static' folder should contain your index.html
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    """Serves other static files like CSS, JS, and assets."""
    return send_from_directory('static', path)


# --- API Endpoints ---

@app.route('/api/songs', methods=['GET'])
def get_all_songs():
    return jsonify(available_songs)

@app.route('/api/queue', methods=['GET'])
def get_queue():
    return jsonify(song_queue)

@app.route('/api/queue/add', methods=['POST'])
def add_to_queue():
    song = request.json
    if song:
        is_duplicate = any(s['song_name'] == song.get('song_name') and s['artist'] == song.get('artist') for s in song_queue)
        if not is_duplicate:
            song_queue.append(song)
            return jsonify({"status": "success", "message": "Song added to queue"}), 200
        else:
            return jsonify({"status": "error", "message": "Song is already in the queue"}), 400
    return jsonify({"status": "error", "message": "Invalid song data"}), 400

@app.route('/api/queue/remove', methods=['POST'])
def remove_from_queue():
    data = request.json
    index = data.get('index')
    if index is not None and 0 <= index < len(song_queue):
        removed_song = song_queue.pop(index)
        return jsonify({"status": "success", "message": f"Removed '{removed_song['song_name']}'"}), 200
    return jsonify({"status": "error", "message": "Invalid index"}), 400
    
@app.route('/api/queue/play', methods=['POST'])
def play_next_in_queue():
    if not song_queue:
        return jsonify({"status": "error", "message": "Queue is empty"}), 404
    song_to_play = song_queue.pop(0)
    return jsonify(song_to_play)


if __name__ == '__main__':
    # Run the app on host 0.0.0.0 to make it accessible on your local network
    app.run(host='0.0.0.0', port=5001, debug=True)
