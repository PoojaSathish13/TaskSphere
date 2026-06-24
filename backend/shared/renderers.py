from rest_framework.renderers import JSONRenderer


class EnvelopeRenderer(JSONRenderer):
    """
    Standardizes all API responses into a unified envelope layout:
    {
        "success": boolean,
        "data": list | dict | null,
        "meta": dict | null,
        "errors": list | dict | null
    }
    """
    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get('response') if renderer_context else None
        status_code = response.status_code if response else 200

        # Check if response is already enveloped (e.g. from exception handler)
        if isinstance(data, dict) and ('success' in data and 'errors' in data and 'data' in data):
            return super().render(data, accepted_media_type, renderer_context)

        success = status_code < 400
        errors = None
        payload = data
        meta = None

        # Check if the output is standard DRF pagination
        if success and isinstance(data, dict) and 'results' in data and all(k in data for k in ('count', 'next', 'previous')):
            payload = data['results']
            meta = {
                'total_count': data['count'],
                'next': data['next'],
                'previous': data['previous']
            }
        
        # If there's an error, data holds the details
        if not success:
            errors = data
            payload = None

        envelope = {
            'success': success,
            'data': payload,
            'meta': meta,
            'errors': errors
        }

        return super().render(envelope, accepted_media_type, renderer_context)
