"""FastAPI routes for user operations."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..data.database import get_db
from ..data.repository import UserRepository
from ..service.schemas import User, UserCreate

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/{user_id}", response_model=User)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get a user by ID."""
    repository = UserRepository(db)
    user = repository.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/", response_model=User, status_code=201)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user."""
    repository = UserRepository(db)

    # Check if user already exists
    existing = repository.get_user_by_email(user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    return repository.create_user(user)
