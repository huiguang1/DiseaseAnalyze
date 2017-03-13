module.exports = {
    tableName: 'Web_cases',
    autoCreatedAt: false,
    autoUpdatedAt: false,
    attributes: {
        id: {
            type: 'integer',
            unique: true,
            primaryKey: true,
            columnName: 'Patient_Id'
        },
        CaseOrigin: {
            type: 'string',
            columnName: 'CaseOrigin'
        },
        PatientName: {
            type: 'string',
            columnName: 'PatientName'
        },
        Sex: {
            type: 'string',
            columnName: 'Sex'
        },
        Age: {
            type: 'string',
            columnName: 'Age'
        },
        Phenotype: {
            type: 'string',
            columnName: 'Phenotype'
        },
        Genotype: {
            type: 'string',
            columnName: 'Genotype'
        },
        Owner: {
            type: 'string',
            columnName: 'Owner'
        },
        View: {
            type: 'string',
            columnName: 'View'
        }
    }
};