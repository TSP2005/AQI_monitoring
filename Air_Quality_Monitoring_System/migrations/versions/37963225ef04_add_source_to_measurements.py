"""add_source_to_measurements

Revision ID: 37963225ef04
Revises: d725c3531f82
Create Date: 2025-03-18 00:42:34.265025

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '37963225ef04'
down_revision: Union[str, None] = 'd725c3531f82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('measurements', sa.Column('source', sa.String(length=50), nullable=False))
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('measurements', 'source')
    # ### end Alembic commands ###
