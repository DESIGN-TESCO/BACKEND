const DesignDocument = require('../models/Document');
const crud = require('./crudFactory');
const { nextSeqId } = require('../utils/ids');

module.exports = crud(DesignDocument, { genId: (M) => nextSeqId(M, 'id', 'DOC-', 3) });
