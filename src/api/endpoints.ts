export const treeApi = {
    create: '/tree/explore-roots/user/tree',
    list: '/tree/explore-roots/user/trees',
    createRoot: '/tree/explore-roots/person/root',
    getWindow: (treeId: string) => `/tree/explore-roots/user/tree/${treeId}/window`,
    addSpouse: (personId: string) => `/tree/explore-roots/person/${personId}/spouse`,
    addSpouseBetweenExisting: '/tree/explore-roots/person/spouse/between-existing',
    addParent: (childId: string) => `/tree/explore-roots/person/${childId}/parent`,
    addChild: (unionId: string) => `/tree/explore-roots/person/${unionId}/child`,
    addSibling: (personId: string) => `/tree/explore-roots/person/${personId}/sibling`,
    moveChildren: '/tree/explore-roots/person/move-children',
    quickCreate: (personId: string) => `/tree/explore-roots/person/${personId}/quick-create`,
    person: (personId: string) => `/tree/explore-roots/person/${personId}`,
    updatePhoto: (personId: string) => `/tree/profile/person/${personId}/photo`,
    importGedcom: '/tree/import-export/import',
    exportGedcom: (treeId: string) => `/tree/import-export/tree/${treeId}/export/gedcom`,
    exportCsv: (treeId: string) => `/tree/import-export/tree/${treeId}/export/csv`,
    mergePersons: (treeId: string) => `/tree/explore-roots/user/tree/${treeId}/merge`,
    delete: (treeId: string) => `/tree/explore-roots/user/tree/${treeId}`,
    duplicate: (treeId: string) => `/tree/explore-roots/user/tree/${treeId}/duplicate`,
    edit: (treeId: string) => `/tree/explore-roots/user/tree/${treeId}/edit`,
    setHomePerson: (treeId: string) => `/tree/import-export/tree/${treeId}/home-person`,
    setDefault: (treeId: string) => `/tree/explore-roots/user/tree/${treeId}/set-default`,
    userList: (treeId: string) => `/tree/explore-roots/user/tree/${treeId}/user-list`,
    nodeDisplayPreferences: (treeId: string) => `/tree/explore-roots/user/tree/${treeId}/node-display-preferences`,
    onboarding: '/tree/explore-roots/ai/onboarding',
    addLifeEvent: (personId: string) => `/tree/profile/person/${personId}/life-events`,
    updateLifeEvent: (eventId: string) => `/tree/profile/person/life-event/${eventId}`,
    deleteLifeEvent: (eventId: string) => `/tree/profile/person/life-event/${eventId}`,
    addSource: (personId: string) => `/tree/profile/person/${personId}/sources`,
};

export const aiApi = {
    relationshipStory: (treeId: string, fromId: string, toId: string, nativeLanguage?: string) => {
        let url = `/ai/relationship-story?tree_id=${treeId}&from_id=${fromId}&to_id=${toId}`;
        if (nativeLanguage) {
            url += `&nativeLanguage=${encodeURIComponent(nativeLanguage)}`;
        }
        return url;
    },
    duplicates: (treeId: string, threshold = 0.65, limit = 25) =>
        `/ai/duplicates?tree_id=${treeId}&threshold=${threshold}&limit=${limit}`,
    resolveFollowup: '/ai/tree-builder/resolve-followup',
    genderIdentify: '/gender-identify',
    lifeStory: (personId: string) => `/ai/life-story/${personId}`,
    dismissDuplicate: '/ai/duplicates/dismiss',
};

export const userApi = {
    exploreRootsUser: '/tree/explore-roots/user',
    exploreRootsUserFallback: '/explore-roots/user',
};
