const Drawing = require('../models/Drawing');
const crud = require('./crudFactory');
const { nextSeqId } = require('../utils/ids');

module.exports = crud(Drawing, { genId: (M) => nextSeqId(M, 'id', 'DWG-', 3) });
