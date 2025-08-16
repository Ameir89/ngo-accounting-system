# README.md
# NGO Accounting System

A comprehensive financial management solution designed specifically for non-governmental organizations, charities, and non-profit entities.

## 🌟 Features

- **Multi-level Chart of Accounts** with hierarchical structure
- **Double-entry bookkeeping** with automated journal entries
- **Multi-currency support** with real-time exchange rates
- **Grant and funding management** with utilization tracking
- **Project-based accounting** with cost center allocation
- **Fixed asset management** with automated depreciation
- **Comprehensive reporting** and analytics
- **Multi-language support** (English/Arabic) with RTL
- **Role-based access control** and audit trails

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
git clone <repository-url>
cd ngo-accounting-system
cp .env.example .env
docker-compose up -d
docker-compose exec backend python database_setup.py create
```

### Manual Setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r ../requirements.txt
python database_setup.py create
python app.py

# Frontend
cd frontend
npm install
npm start
```

## 🌐 Access

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Default Login**: admin / admin123

## 📚 Documentation

- [User Manual](docs/user-manual.md)
- [API Documentation](docs/api-documentation.yaml)
- [Deployment Guide](docs/deployment-guide.md)
- [Developer Guide](docs/developer-guide.md)

## 🤝 Contributing

Please read our [contributing guidelines](CONTRIBUTING.md) before submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.