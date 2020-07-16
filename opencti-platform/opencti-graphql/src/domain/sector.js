import {
  createEntity,
  escapeString,
  findWithConnectedRelations,
  getSingleValueNumber,
  listEntities,
  loadEntityById,
} from '../database/grakn';
import { BUS_TOPICS } from '../config/conf';
import { notify } from '../database/redis';
import { buildPagination } from '../database/utils';
import { ENTITY_TYPE_IDENTITY_SECTOR, RELATION_PART_OF } from '../utils/idGenerator';

export const findById = (sectorId) => {
  return loadEntityById(sectorId, ENTITY_TYPE_IDENTITY_SECTOR);
};

export const findAll = (args) => {
  return listEntities([ENTITY_TYPE_IDENTITY_SECTOR], ['name', 'alias'], args);
};

export const parentSectors = (sectorId) => {
  return findWithConnectedRelations(
    `match $to isa ${ENTITY_TYPE_IDENTITY_SECTOR}; 
    $rel(${RELATION_PART_OF}_from:$from, ${RELATION_PART_OF}_to:$to) isa ${RELATION_PART_OF};
    $from has internal_id "${escapeString(sectorId)}"; get;`,
    'to',
    { extraRelKey: 'rel' }
  ).then((data) => buildPagination(0, 0, data, data.length));
};

export const subSectors = (sectorId) => {
  return findWithConnectedRelations(
    `match $from isa ${ENTITY_TYPE_IDENTITY_SECTOR}; 
    $rel(${RELATION_PART_OF}_from:$from, ${RELATION_PART_OF}_to:$to) isa ${RELATION_PART_OF};
    $to has internal_id "${escapeString(sectorId)}"; get;`,
    'from',
    { extraRelKey: 'rel' }
  ).then((data) => buildPagination(0, 0, data, data.length));
};

export const isSubSector = async (sectorId, args) => {
  const numberOfParents = await getSingleValueNumber(
    `match $parent isa ${ENTITY_TYPE_IDENTITY_SECTOR}; 
    $rel(${RELATION_PART_OF}_from:$subsector, ${RELATION_PART_OF}_to:$parent) isa ${RELATION_PART_OF}; 
    $subsector has internal_id "${escapeString(sectorId)}"; get; count;`,
    args
  );
  return numberOfParents > 0;
};

export const addSector = async (user, sector) => {
  const created = await createEntity(user, sector, ENTITY_TYPE_IDENTITY_SECTOR);
  return notify(BUS_TOPICS.StixDomainEntity.ADDED_TOPIC, created, user);
};
