package com.bogdanmihaiciuc.profiler;

import com.thingworx.metadata.annotations.ThingworxServiceDefinition;
import com.thingworx.metadata.annotations.ThingworxServiceResult;
import com.thingworx.resources.Resource;
import java.lang.reflect.Field;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.ScriptableObject;

/**
 * A resource that grants access to the standard rhino objects.
 */
public class BMProfilerJavaBridgeHelper extends Resource {
    @ThingworxServiceDefinition(name = "InitStandardObjects", description = "Initializes the standard objects that allow the debugger runtime to access java classes.")
    @ThingworxServiceResult(
        name = "result",
        baseType = "NOTHING"
    )
    public void InitStandardObjects() throws Exception {
        Context context = Context.getCurrentContext();

        Field topCallField = Context.class.getDeclaredField("topCallScope");
        topCallField.setAccessible(true);

        ScriptableObject topCall = (ScriptableObject) topCallField.get(context);
        context.initStandardObjects(topCall);
    }
}
