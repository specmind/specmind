"""Flask routes for email operations."""
from flask import Blueprint, request, jsonify
from ..service.email_service import EmailService
from ..external.api_client import ApiClient

bp = Blueprint('emails', __name__, url_prefix='/api/emails')
email_service = EmailService()
api_client = ApiClient()

@bp.route('/send', methods=['POST'])
def send_email():
    """Send an email based on request type."""
    data = request.get_json()
    email_type = data.get('type')

    if email_type == 'task_completed':
        task_id = data.get('task_id')
        user_id = data.get('user_id')

        # Fetch user details
        user = api_client.get_user(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        success = email_service.send_task_completed_email(task_id, user['email'])
        if success:
            return jsonify({'status': 'sent', 'to': user['email']}), 200
        return jsonify({'error': 'Failed to send email'}), 500

    elif email_type == 'welcome':
        user_id = data.get('user_id')
        to_email = data.get('to')

        # Fetch user details
        user = api_client.get_user(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        success = email_service.send_welcome_email(to_email, user['username'])
        if success:
            return jsonify({'status': 'sent', 'to': to_email}), 200
        return jsonify({'error': 'Failed to send email'}), 500

    return jsonify({'error': 'Invalid email type'}), 400

@bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'healthy'}), 200
