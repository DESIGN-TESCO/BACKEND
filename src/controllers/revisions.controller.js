const Revision = require('../models/Revision');
const crud = require('./crudFactory');
const { nextSeqId } = require('../utils/ids');

module.exports = crud(Revision, { genId: (M) => nextSeqId(M, 'id', 'REV-', 3) });
