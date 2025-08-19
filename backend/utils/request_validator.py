# backend/utils/request_validator.py
from marshmallow import Schema, fields, validate, ValidationError
from flask import request, jsonify
from functools import wraps
import re

class RequestValidator:
    """Request validation using Marshmallow schemas"""
    
    def __init__(self):
        self.schemas = {}
        self._setup_schemas()
    
    def _setup_schemas(self):
        """Setup validation schemas for different endpoints"""
        
        # Authentication schemas
        class LoginSchema(Schema):
            username = fields.Str(required=True, validate=validate.Length(min=3, max=50))
            password = fields.Str(required=True, validate=validate.Length(min=1))
        
        class RegisterSchema(Schema):
            username = fields.Str(required=True, validate=validate.Length(min=3, max=50))
            email = fields.Email(required=True)
            password = fields.Str(required=True, validate=validate.Length(min=8))
            first_name = fields.Str(required=True, validate=validate.Length(min=1, max=50))
            last_name = fields.Str(required=True, validate=validate.Length(min=1, max=50))
            role_id = fields.Int(required=True, validate=validate.Range(min=1))
            phone = fields.Str(validate=validate.Length(max=20))
            language = fields.Str(validate=validate.OneOf(['en', 'ar']))
        
        # Account schemas
        class AccountSchema(Schema):
            code = fields.Str(required=True, validate=[
                validate.Length(min=3, max=20),
                validate.Regexp(r'^[A-Za-z0-9]+$', error='Account code must be alphanumeric')
            ])
            name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
            name_ar = fields.Str(validate=validate.Length(max=100))
            account_type = fields.Str(required=True, validate=validate.OneOf([
                'asset', 'liability', 'equity', 'revenue', 'expense'
            ]))
            parent_id = fields.Int(validate=validate.Range(min=1))
            description = fields.Str(validate=validate.Length(max=500))
        
        # Journal Entry schemas
        class JournalEntryLineSchema(Schema):
            account_id = fields.Int(required=True, validate=validate.Range(min=1))
            cost_center_id = fields.Int(validate=validate.Range(min=1))
            project_id = fields.Int(validate=validate.Range(min=1))
            description = fields.Str(validate=validate.Length(max=200))
            debit_amount = fields.Decimal(places=2, validate=validate.Range(min=0))
            credit_amount = fields.Decimal(places=2, validate=validate.Range(min=0))
            line_number = fields.Int(validate=validate.Range(min=1))
        
        class JournalEntrySchema(Schema):
            entry_date = fields.Date(required=True)
            description = fields.Str(required=True, validate=validate.Length(min=1, max=500))
            entry_type = fields.Str(validate=validate.OneOf(['manual', 'automated']))
            reference_number = fields.Str(validate=validate.Length(max=50))
            currency_id = fields.Int(validate=validate.Range(min=1))
            exchange_rate = fields.Decimal(places=6, validate=validate.Range(min=0.000001))
            lines = fields.List(fields.Nested(JournalEntryLineSchema), required=True, validate=validate.Length(min=2))
        
        # Grant schemas
        class GrantSchema(Schema):
            grant_number = fields.Str(required=True, validate=validate.Length(min=1, max=50))
            title = fields.Str(required=True, validate=validate.Length(min=1, max=200))
            title_ar = fields.Str(validate=validate.Length(max=200))
            donor_id = fields.Int(required=True, validate=validate.Range(min=1))
            project_id = fields.Int(validate=validate.Range(min=1))
            amount = fields.Decimal(required=True, places=2, validate=validate.Range(min=0.01))
            currency_id = fields.Int(required=True, validate=validate.Range(min=1))
            start_date = fields.Date(required=True)
            end_date = fields.Date(required=True)
            conditions = fields.Str(validate=validate.Length(max=1000))
            description = fields.Str(validate=validate.Length(max=1000))
        
        # Store schemas
        self.schemas = {
            'login': LoginSchema(),
            'register': RegisterSchema(),
            'account': AccountSchema(),
            'journal_entry': JournalEntrySchema(),
            'grant': GrantSchema()
        }
    
    def validate_request(self, schema_name):
        """Decorator to validate request data"""
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                if schema_name not in self.schemas:
                    return jsonify({'message': 'Invalid validation schema'}), 500
                
                schema = self.schemas[schema_name]
                
                try:
                    if request.is_json:
                        data = request.get_json()
                    else:
                        data = request.form.to_dict()
                    
                    # Validate data
                    validated_data = schema.load(data)
                    
                    # Add validated data to request context
                    request.validated_data = validated_data
                    
                    return f(*args, **kwargs)
                    
                except ValidationError as err:
                    return jsonify({
                        'message': 'Validation failed',
                        'errors': err.messages
                    }), 400
                except Exception as e:
                    return jsonify({
                        'message': 'Request validation error',
                        'error': str(e)
                    }), 400
            
            return decorated_function
        return decorator
    
    def validate_query_params(self, **param_rules):
        """Decorator to validate query parameters"""
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                errors = {}
                
                for param_name, rules in param_rules.items():
                    value = request.args.get(param_name)
                    
                    if 'required' in rules and rules['required'] and not value:
                        errors[param_name] = ['This parameter is required']
                        continue
                    
                    if value is not None:
                        # Type validation
                        if 'type' in rules:
                            try:
                                if rules['type'] == int:
                                    value = int(value)
                                elif rules['type'] == float:
                                    value = float(value)
                                elif rules['type'] == bool:
                                    value = value.lower() in ['true', '1', 'yes']
                            except ValueError:
                                errors[param_name] = [f'Must be a valid {rules["type"].__name__}']
                                continue
                        
                        # Range validation for numbers
                        if 'min' in rules and isinstance(value, (int, float)) and value < rules['min']:
                            errors[param_name] = [f'Must be at least {rules["min"]}']
                        
                        if 'max' in rules and isinstance(value, (int, float)) and value > rules['max']:
                            errors[param_name] = [f'Must be at most {rules["max"]}']
                        
                        # Choice validation
                        if 'choices' in rules and value not in rules['choices']:
                            errors[param_name] = [f'Must be one of: {", ".join(rules["choices"])}']
                
                if errors:
                    return jsonify({
                        'message': 'Query parameter validation failed',
                        'errors': errors
                    }), 400
                
                return f(*args, **kwargs)
            
            return decorated_function
        return decorator