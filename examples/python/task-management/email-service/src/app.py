"""Flask application entry point."""
from flask import Flask
from dotenv import load_dotenv
from .api.routes import bp as email_bp

load_dotenv()

def create_app():
    """Create and configure the Flask app."""
    app = Flask(__name__)

    # Register blueprints
    app.register_blueprint(email_bp)

    @app.route('/health')
    def health():
        return {'status': 'healthy'}

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=3001, debug=True)
