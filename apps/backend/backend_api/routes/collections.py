"""
Problem Collections API Routes

Endpoints for:
- Collections CRUD (create, read, update, delete)
- Add/remove problems from collections
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from backend_db import get_session
from backend_db.discovery_models import ProblemCollection, DiscoveredProblem, collection_problems


router = APIRouter(prefix="/collections", tags=["Collections"])


# --- Pydantic Schemas ---

class CollectionCreate(BaseModel):
    """Create a new collection."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    color: str = Field(default="#6366f1", pattern="^#[0-9a-fA-F]{6}$")
    icon: str = Field(default="folder", max_length=50)


class CollectionUpdate(BaseModel):
    """Update a collection."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern="^#[0-9a-fA-F]{6}$")
    icon: Optional[str] = Field(None, max_length=50)


class CollectionResponse(BaseModel):
    """Collection response."""
    id: str
    name: str
    description: Optional[str]
    color: str
    icon: str
    problem_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CollectionWithProblems(CollectionResponse):
    """Collection with problem IDs."""
    problem_ids: List[str] = []


class AddProblemsRequest(BaseModel):
    """Add problems to a collection."""
    problem_ids: List[str]


# --- Endpoints ---

@router.get("", response_model=List[CollectionResponse])
async def list_collections(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """List all collections."""
    query = select(ProblemCollection).order_by(desc(ProblemCollection.updated_at)).limit(limit).offset(offset)
    result = await session.execute(query)
    collections = result.scalars().all()
    return [CollectionResponse.model_validate(c) for c in collections]


@router.post("", response_model=CollectionResponse)
async def create_collection(
    data: CollectionCreate,
    session: AsyncSession = Depends(get_session),
):
    """Create a new collection."""
    collection = ProblemCollection(
        name=data.name,
        description=data.description,
        color=data.color,
        icon=data.icon,
    )
    session.add(collection)
    await session.commit()
    await session.refresh(collection)
    return CollectionResponse.model_validate(collection)


@router.get("/{collection_id}", response_model=CollectionWithProblems)
async def get_collection(
    collection_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Get a collection with its problem IDs."""
    result = await session.execute(
        select(ProblemCollection)
        .options(selectinload(ProblemCollection.problems))
        .where(ProblemCollection.id == collection_id)
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Get problem IDs
    problem_ids = [p.id for p in collection.problems]
    
    return CollectionWithProblems(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        color=collection.color,
        icon=collection.icon,
        problem_count=collection.problem_count,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        problem_ids=problem_ids,
    )


@router.put("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: str,
    data: CollectionUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Update a collection."""
    result = await session.execute(
        select(ProblemCollection).where(ProblemCollection.id == collection_id)
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Update fields
    if data.name is not None:
        collection.name = data.name
    if data.description is not None:
        collection.description = data.description
    if data.color is not None:
        collection.color = data.color
    if data.icon is not None:
        collection.icon = data.icon
    
    await session.commit()
    await session.refresh(collection)
    return CollectionResponse.model_validate(collection)


@router.delete("/{collection_id}")
async def delete_collection(
    collection_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Delete a collection."""
    result = await session.execute(
        select(ProblemCollection).where(ProblemCollection.id == collection_id)
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    await session.delete(collection)
    await session.commit()
    return {"message": "Collection deleted", "id": collection_id}


@router.post("/{collection_id}/problems")
async def add_problems_to_collection(
    collection_id: str,
    data: AddProblemsRequest,
    session: AsyncSession = Depends(get_session),
):
    """Add problems to a collection."""
    # Get collection
    result = await session.execute(
        select(ProblemCollection)
        .options(selectinload(ProblemCollection.problems))
        .where(ProblemCollection.id == collection_id)
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Get existing problem IDs
    existing_ids = {p.id for p in collection.problems}
    
    # Fetch problems to add
    new_ids = [pid for pid in data.problem_ids if pid not in existing_ids]
    if not new_ids:
        return {"message": "No new problems to add", "added": 0}
    
    result = await session.execute(
        select(DiscoveredProblem).where(DiscoveredProblem.id.in_(new_ids))
    )
    problems = result.scalars().all()
    
    # Link problems
    for problem in problems:
        collection.problems.append(problem)
        # Auto-save the problem when adding to collection
        problem.is_saved = True
    
    # Update count
    collection.problem_count = len(existing_ids) + len(problems)
    
    await session.commit()
    return {"message": f"Added {len(problems)} problems", "added": len(problems)}


@router.delete("/{collection_id}/problems/{problem_id}")
async def remove_problem_from_collection(
    collection_id: str,
    problem_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Remove a problem from a collection."""
    # Get collection
    result = await session.execute(
        select(ProblemCollection)
        .options(selectinload(ProblemCollection.problems))
        .where(ProblemCollection.id == collection_id)
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Find and remove problem
    problem_to_remove = None
    for p in collection.problems:
        if p.id == problem_id:
            problem_to_remove = p
            break
    
    if not problem_to_remove:
        raise HTTPException(status_code=404, detail="Problem not in collection")
    
    collection.problems.remove(problem_to_remove)
    collection.problem_count = max(0, collection.problem_count - 1)
    
    await session.commit()
    return {"message": "Problem removed from collection"}


@router.get("/{collection_id}/problems")
async def get_collection_problems(
    collection_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """Get all problems in a collection."""
    # Verify collection exists
    result = await session.execute(
        select(ProblemCollection).where(ProblemCollection.id == collection_id)
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Get problems with pagination
    result = await session.execute(
        select(DiscoveredProblem)
        .join(collection_problems)
        .where(collection_problems.c.collection_id == collection_id)
        .order_by(desc(collection_problems.c.added_at))
        .limit(limit)
        .offset(offset)
    )
    problems = result.scalars().all()
    
    # Build response
    from backend_api.routes.discovery import ProblemResponse
    return [ProblemResponse.model_validate(p) for p in problems]
